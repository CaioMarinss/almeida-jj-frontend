import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, tokenDe } from '../suporte/contas';
import { botao, entrar, esperarToast, responderAlerta } from '../suporte/telas';

async function sairDaSessao(page: Page): Promise<void> {
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => sessionStorage.clear());
  }
}

async function chipDoPerfil(page: Page, esperado: string): Promise<void> {
  await page.goto('/app/perfil');
  await expect(page.locator('app-perfil .ajj-chip')).toHaveText(esperado);
}

async function alterarPorApi(request: APIRequestContext, autor: Conta, alvo: Conta, perfil: string) {
  return request.put(`${URL_API}/alunos/${await idDe(request, alvo)}/perfil`, {
    headers: { Authorization: `Bearer ${await tokenDe(request, autor)}` },
    data: { perfil }
  });
}

test.describe('Cargos', () => {
  test('o dono vê o cargo e chega em Professores pelo perfil', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);

    await chipDoPerfil(page, 'Dono');
    await botao(page, 'Gerenciar professores').click();

    await expect(page).toHaveURL(/\/app\/professores$/);
    await expect(page.locator(`li.pessoa[data-email="${dono.email}"]`)).toBeVisible();
  });

  test('o dono promove e rebaixa um aluno', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const linha = page.locator(`li.pessoa[data-email="${aluno.email}"]`);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await page.goto('/app/professores');
    await linha.getByRole('button', { name: 'Tornar professor' }).click();
    await responderAlerta(page, 'Tornar professor');
    await esperarToast(page, 'agora é professor');
    await expect(linha.locator('.ajj-chip')).toHaveText('Professor');

    await sairDaSessao(page);
    await entrar(page, aluno.email, aluno.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await chipDoPerfil(page, 'Professor');

    await sairDaSessao(page);
    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await page.goto('/app/professores');
    await linha.getByRole('button', { name: 'Remover professor' }).click();
    await responderAlerta(page, 'Remover');
    await esperarToast(page, 'voltou a ser aluno');
    await expect(linha.locator('.ajj-chip')).toHaveText('Aluno');

    await sairDaSessao(page);
    await entrar(page, aluno.email, aluno.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await chipDoPerfil(page, 'Aluno');
  });

  test('aluno e professor não acessam Professores', async ({ page, request }) => {
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

      await page.goto('/app/professores');
      await expect(page).toHaveURL(/\/app\/inicio$/);
    }
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('o menu lateral do dono tem Professores', async ({ page, request }) => {
      const dono = await criarDono(request);
      await entrar(page, dono.email, dono.senha);
      await expect(page).toHaveURL(/\/app\/inicio$/);

      await page.locator('ion-menu ion-item', { hasText: 'Professores' }).click();

      await expect(page).toHaveURL(/\/app\/professores$/);
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
