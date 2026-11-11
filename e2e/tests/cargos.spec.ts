import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, nomear, sufixoUnico, tokenDe } from '../suporte/contas';
import { botao, entrar, entrarComoDono, esperarToast, irParaAba, responderAlerta } from '../suporte/telas';

async function sairDaSessao(page: Page): Promise<void> {
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => sessionStorage.clear());
  }
}

async function chipDoPerfil(page: Page, esperado: string): Promise<void> {
  await page.goto('/app/perfil');
  await expect(page.locator('app-perfil .ajj-chip')).toHaveText(esperado);
}

async function abrirFicha(page: Page, pessoa: Conta): Promise<void> {
  await page.goto('/app/alunos');
  await page.locator('#busca-aluno').fill(pessoa.nome);
  const linha = page.locator(`li.aluno[data-email="${pessoa.email}"]`);
  await expect(linha).toBeVisible();
  await linha.locator('a.linha').click();
  await expect(page).toHaveURL(/\/app\/alunos\/\d+$/);
  await expect(page.locator('app-ficha-aluno header.cabeca')).toContainText(pessoa.nome);
}

function cargoDaFicha(page: Page) {
  return page.locator('app-ficha-aluno header.cabeca .cargo');
}

async function alterarPorApi(request: APIRequestContext, autor: Conta, alvo: Conta, perfil: string) {
  return request.put(`${URL_API}/alunos/${await idDe(request, alvo)}/perfil`, {
    headers: { Authorization: `Bearer ${await tokenDe(request, autor)}` },
    data: { perfil }
  });
}

test.describe('Cargos', () => {
  test('o dono vê o cargo no perfil, chega em Alunos pela aba e a ficha dele não tem botão de cargo', async ({ page, request }) => {
    const dono = nomear(await criarDono(request), `Dono${sufixoUnico()}`);
    await entrarComoDono(page, dono.email, dono.senha);

    await chipDoPerfil(page, 'Dono');
    await expect(botao(page, 'Gerenciar professores')).toHaveCount(0);
    await irParaAba(page, 'Alunos');

    await expect(page).toHaveURL(/\/app\/alunos$/);
    await abrirFicha(page, dono);
    await expect(cargoDaFicha(page)).toHaveText('Dono');
    await expect(botao(page, 'Tornar professor')).toHaveCount(0);
    await expect(botao(page, 'Voltar a aluno')).toHaveCount(0);
  });

  test('o dono promove e rebaixa um aluno pela ficha', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = nomear(await criarContaAtiva(request), `Cargo${sufixoUnico()}`);

    await entrarComoDono(page, dono.email, dono.senha);
    await abrirFicha(page, aluno);
    await expect(cargoDaFicha(page)).toHaveText('Aluno');
    await botao(page, 'Tornar professor').click();
    await responderAlerta(page, 'Tornar professor');
    await esperarToast(page, 'agora é professor');
    await expect(cargoDaFicha(page)).toHaveText('Professor');
    await expect(botao(page, 'Voltar a aluno')).toBeVisible();

    await sairDaSessao(page);
    await entrar(page, aluno.email, aluno.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await chipDoPerfil(page, 'Professor');

    await sairDaSessao(page);
    await entrarComoDono(page, dono.email, dono.senha);
    await abrirFicha(page, aluno);
    await botao(page, 'Voltar a aluno').click();
    await responderAlerta(page, 'Remover');
    await esperarToast(page, 'voltou a ser aluno');
    await expect(cargoDaFicha(page)).toHaveText('Aluno');
    await expect(botao(page, 'Tornar professor')).toBeVisible();

    await sairDaSessao(page);
    await entrar(page, aluno.email, aluno.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await chipDoPerfil(page, 'Aluno');
  });

  test('o filtro Professores da lista de alunos mostra o professor promovido', async ({ page, request }) => {
    const dono = await criarDono(request);
    const professor = nomear(await criarContaAtiva(request), `Prof${sufixoUnico()}`);
    expect((await alterarPorApi(request, dono, professor, 'PROFESSOR')).status()).toBe(204);

    await entrarComoDono(page, dono.email, dono.senha);
    await page.goto('/app/alunos');
    await page.locator('#busca-aluno').fill(professor.nome);
    await page.getByRole('group', { name: 'Filtrar alunos' }).getByRole('button', { name: 'Professores', exact: true }).click();

    const linha = page.locator(`li.aluno[data-email="${professor.email}"]`);
    await expect(linha).toBeVisible();
    await expect(linha).toContainText('Professor');
  });

  test('aluno e professor não acessam Alunos', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const professor = await criarContaAtiva(request);
    expect((await alterarPorApi(request, dono, professor, 'PROFESSOR')).status()).toBe(204);

    for (const conta of [aluno, professor]) {
      await sairDaSessao(page);
      await entrar(page, conta.email, conta.senha);
      await expect(page).toHaveURL(/\/app\/inicio$/);
      await page.goto('/app/perfil');
      await expect(page.locator('app-perfil .ajj-chip')).toBeVisible();
      await expect(botao(page, 'Gerenciar professores')).toHaveCount(0);

      await page.goto('/app/alunos');
      await expect(page).toHaveURL(/\/app\/inicio$/);
    }
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('o menu lateral do dono tem Alunos', async ({ page, request }) => {
      const dono = await criarDono(request);
      await entrarComoDono(page, dono.email, dono.senha);

      await page.locator('ion-menu ion-item', { hasText: 'Alunos' }).click();

      await expect(page).toHaveURL(/\/app\/alunos$/);
    });

    test('API: professor e aluno não alteram cargo', async ({ request }) => {
      const dono = await criarDono(request);
      const aluno = await criarContaAtiva(request);
      const professor = await criarContaAtiva(request);
      const alvo = await criarContaAtiva(request);
      expect((await alterarPorApi(request, dono, professor, 'PROFESSOR')).status()).toBe(204);

      expect((await alterarPorApi(request, professor, alvo, 'PROFESSOR')).status()).toBe(403);
      expect((await alterarPorApi(request, aluno, alvo, 'PROFESSOR')).status()).toBe(403);
    });

    test('API: o cargo de outro dono não muda pelo app', async ({ request }) => {
      const dono = await criarDono(request);
      const outroDono = await criarDono(request);

      const resposta = await alterarPorApi(request, dono, outroDono, 'ALUNO');

      expect(resposta.status()).toBe(422);
      expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR010');
    });

    test('API: ninguém vira dono pelo app', async ({ request }) => {
      const dono = await criarDono(request);
      const aluno = await criarContaAtiva(request);

      const resposta = await alterarPorApi(request, dono, aluno, 'DONO');

      expect(resposta.status()).toBe(400);
    });
  });
});
