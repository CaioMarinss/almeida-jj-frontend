import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { executarSql } from '../suporte/banco';
import { Conta, criarContaAtiva, criarDono, idDe, tokenDe } from '../suporte/contas';
import { botao, entrar, esperarAlerta, esperarToast, responderAlerta } from '../suporte/telas';

interface Faixa {
  id: number;
  codigo: string;
  grauMax: number;
}

interface Graduacao {
  atual: { faixa: Faixa; grau: number } | null;
  historico: unknown[];
  proxima: string | null;
}

async function sairDaSessao(page: Page): Promise<void> {
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => sessionStorage.clear());
  }
}

function diaRelativo(dias: number): string {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [ano, mes, dia] = hoje.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function diaMes(data: string): string {
  const [, mes, dia] = data.split('-');
  return `${dia}/${mes}`;
}

async function criarAluno(request: APIRequestContext): Promise<Conta> {
  const conta = await criarContaAtiva(request);
  const nome = `Gradu${Date.now()}${Math.floor(Math.random() * 100000)}`;
  executarSql(`UPDATE ALMEIDAJJ.ALUNOS SET NOME = '${nome}' WHERE EMAIL = '${conta.email}'`);
  return { ...conta, nome };
}

async function autorizacao(request: APIRequestContext, conta: Conta): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await tokenDe(request, conta)}` };
}

async function faixaPorCodigo(request: APIRequestContext, conta: Conta, codigo: string): Promise<Faixa> {
  const resposta = await request.get(`${URL_API}/graduacoes/faixas`, { headers: await autorizacao(request, conta) });
  expect(resposta.status()).toBe(200);
  const faixa = ((await resposta.json()) as Faixa[]).find(f => f.codigo === codigo);
  expect(faixa, codigo).toBeDefined();
  return faixa as Faixa;
}

async function registrarPorApi(
  request: APIRequestContext,
  autor: Conta,
  alvo: Conta,
  corpo: { idGraduacao: number; grau: number; data?: string }
) {
  return request.post(`${URL_API}/alunos/${await idDe(request, alvo)}/graduacoes`, {
    headers: await autorizacao(request, autor),
    data: corpo
  });
}

async function graduacaoDe(request: APIRequestContext, conta: Conta): Promise<Graduacao> {
  const resposta = await request.get(`${URL_API}/alunos/me/graduacao`, { headers: await autorizacao(request, conta) });
  return (await resposta.json()) as Graduacao;
}

async function cancelarProxima(request: APIRequestContext, dono: Conta): Promise<void> {
  await request.delete(`${URL_API}/graduacoes/proxima`, { headers: await autorizacao(request, dono) });
}

async function abrirAluno(page: Page, aluno: Conta): Promise<void> {
  await page.goto('/app/graduacao');
  await page.locator('#busca-aluno').fill(aluno.nome);
  const linha = page.locator(`li.aluno[data-email="${aluno.email}"]`);
  await expect(linha).toBeVisible();
  await linha.getByRole('button').click();
  await expect(page.locator('app-registro-graduacao')).toBeVisible();
}

async function registrarPelaTela(page: Page, faixa: string, grau: string, data?: string): Promise<void> {
  await page.locator('#registro-faixa').selectOption({ label: faixa });
  await page.locator('#registro-grau').selectOption({ label: grau });
  if (data) {
    await page.locator('#registro-data').fill(data);
  }
  await page.locator('app-registro-graduacao').getByRole('button', { name: 'Salvar', exact: true }).click();
  await esperarToast(page, 'Graduação registrada.');
}

async function fecharModal(page: Page): Promise<void> {
  await page.locator('ion-modal').getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('app-registro-graduacao')).toHaveCount(0);
}

async function trocarDeConta(page: Page, conta: Conta): Promise<void> {
  await sairDaSessao(page);
  await entrar(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/app\/inicio$/);
}

test.describe('Graduação', () => {
  test('o dono registra faixa e grau e o aluno acompanha a evolução no início', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await abrirAluno(page, aluno);
    await registrarPelaTela(page, 'Faixa Azul', '1º grau');

    await trocarDeConta(page, aluno);
    const card = page.locator('app-card-graduacao');
    await expect(card.getByRole('heading', { name: 'Faixa Azul · 1 grau' })).toBeVisible();
    await expect(card.getByRole('img', { name: 'Faixa Azul · 1 grau' })).toBeVisible();
    await expect(card.locator('.evolucao li')).toHaveCount(1);

    await trocarDeConta(page, dono);
    await abrirAluno(page, aluno);
    await registrarPelaTela(page, 'Faixa Azul', '2º grau');

    await trocarDeConta(page, aluno);
    await expect(card.getByRole('img', { name: 'Faixa Azul · 2 graus' })).toBeVisible();
    await expect(card.locator('.evolucao li')).toHaveCount(2);
  });

  test('registro com data anterior à faixa atual entra só no histórico', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);
    const azul = await faixaPorCodigo(request, dono, 'FA');
    expect((await registrarPorApi(request, dono, aluno, { idGraduacao: azul.id, grau: 2 })).status()).toBe(201);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await abrirAluno(page, aluno);
    await expect(page.locator('app-registro-graduacao ul.historico li')).toHaveCount(1);
    await page.locator('#registro-faixa').selectOption({ label: 'Faixa Branca' });
    await page.locator('#registro-data').fill(diaRelativo(-3));
    await expect(page.getByText('Data anterior à faixa atual: entra só no histórico.')).toBeVisible();
    await page.locator('app-registro-graduacao').getByRole('button', { name: 'Salvar', exact: true }).click();
    await esperarToast(page, 'Graduação registrada.');

    await expect(page.locator('app-registro-graduacao ul.historico li')).toHaveCount(2);
    const graduacao = await graduacaoDe(request, aluno);
    expect(graduacao.historico).toHaveLength(2);
    expect(graduacao.atual?.faixa.codigo).toBe('FA');
    expect(graduacao.atual?.grau).toBe(2);
  });

  test('registro com data passada mais recente que a atual troca a faixa', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);
    const branca = await faixaPorCodigo(request, dono, 'FB');
    expect((await registrarPorApi(request, dono, aluno, { idGraduacao: branca.id, grau: 1, data: diaRelativo(-20) })).status()).toBe(201);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await abrirAluno(page, aluno);
    await page.locator('#registro-faixa').selectOption({ label: 'Faixa Azul' });
    await page.locator('#registro-data').fill(diaRelativo(-3));
    await expect(page.getByText('Data anterior à faixa atual: entra só no histórico.')).toHaveCount(0);
    await page.locator('app-registro-graduacao').getByRole('button', { name: 'Salvar', exact: true }).click();
    await esperarToast(page, 'Graduação registrada.');

    const graduacao = await graduacaoDe(request, aluno);
    expect(graduacao.historico).toHaveLength(2);
    expect(graduacao.atual?.faixa.codigo).toBe('FA');
    await expect(page.locator('app-registro-graduacao .atual')).toContainText('Faixa Azul');
  });

  test('busca por nome e filtro por faixa encontram o aluno', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);
    const outro = await criarAluno(request);
    const azul = await faixaPorCodigo(request, dono, 'FA');
    expect((await registrarPorApi(request, dono, aluno, { idGraduacao: azul.id, grau: 1 })).status()).toBe(201);
    const linha = page.locator(`li.aluno[data-email="${aluno.email}"]`);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await page.goto('/app/graduacao');
    await page.locator('#busca-aluno').fill(aluno.nome.toUpperCase());
    await expect(linha).toBeVisible();
    await expect(page.locator(`li.aluno[data-email="${outro.email}"]`)).toHaveCount(0);

    await page.locator('#filtro-faixa').selectOption({ label: 'Faixa Azul' });
    await expect(linha).toBeVisible();
    await expect(linha.getByRole('img', { name: 'Faixa Azul · 1 grau' })).toBeVisible();

    await page.locator('#filtro-faixa').selectOption({ label: 'Faixa Roxa' });
    await expect(linha).toHaveCount(0);

    await page.locator('#filtro-faixa').selectOption({ label: 'Todas' });
    await page.locator('#busca-aluno').fill(outro.nome);
    await page.locator('#filtro-faixa').selectOption({ label: 'Sem graduação' });
    await expect(page.locator(`li.aluno[data-email="${outro.email}"]`)).toContainText('Sem graduação');
  });

  test('aluno e professor não veem Graduação e são barrados na rota', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const professor = await criarContaAtiva(request);
    const promocao = await request.put(`${URL_API}/alunos/${await idDe(request, professor)}/perfil`, {
      headers: await autorizacao(request, dono),
      data: { perfil: 'PROFESSOR' }
    });
    expect(promocao.status()).toBe(204);

    for (const conta of [aluno, professor]) {
      await trocarDeConta(page, conta);
      await expect(page.locator('ion-menu ion-item').filter({ hasText: 'Graduação' })).toHaveCount(0);
      await page.goto('/app/perfil');
      await expect(page.locator('app-perfil .ajj-chip')).toBeVisible();
      await expect(botao(page, 'Gerenciar graduações')).toHaveCount(0);

      await page.goto('/app/graduacao');
      await expect(page).toHaveURL(/\/app\/inicio$/);
    }
  });

  test('o dono chega em Graduação pelo perfil', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);

    await page.goto('/app/perfil');
    await botao(page, 'Gerenciar graduações').click();

    await expect(page).toHaveURL(/\/app\/graduacao$/);
    await expect(page.locator('#busca-aluno')).toBeVisible();
  });

  test('o dono abre o registro de um aluno e fecha pelo botão Fechar', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);

    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await abrirAluno(page, aluno);
    await fecharModal(page);

    await expect(page.locator('#busca-aluno')).toBeVisible();
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('o menu lateral do dono tem Graduação', async ({ page, request }) => {
      const dono = await criarDono(request);
      await entrar(page, dono.email, dono.senha);
      await expect(page).toHaveURL(/\/app\/inicio$/);

      await page.locator('ion-menu ion-item', { hasText: 'Graduação' }).click();

      await expect(page).toHaveURL(/\/app\/graduacao$/);
    });

    test('conta desativada antes de salvar mostra o erro e a tela continua usável', async ({ page, request }) => {
      const dono = await criarDono(request);
      const aluno = await criarAluno(request);

      await entrar(page, dono.email, dono.senha);
      await expect(page).toHaveURL(/\/app\/inicio$/);
      await abrirAluno(page, aluno);
      executarSql(`UPDATE ALMEIDAJJ.ALUNOS SET SITUACAO = 'I' WHERE EMAIL = '${aluno.email}'`);

      await page.locator('#registro-faixa').selectOption({ label: 'Faixa Azul' });
      const salvar = page.locator('app-registro-graduacao').getByRole('button', { name: 'Salvar', exact: true });
      await salvar.click();

      await esperarAlerta(page, 'Aluno não encontrado');
      await responderAlerta(page, 'OK');
      await expect(page.locator('ion-toast .toast-message').filter({ hasText: 'Graduação registrada.' })).toHaveCount(0);
      await expect(salvar).toBeEnabled();
      await expect(page.locator('app-registro-graduacao')).toBeVisible();

      await fecharModal(page);
      await expect(page.locator('#busca-aluno')).toBeVisible();
    });

    test.describe.serial('próxima graduação', () => {
      test('agendar mostra a data ao aluno e cancelar volta ao aviso', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarContaAtiva(request);
        const futura = diaRelativo(10);
        await cancelarProxima(request, dono);

        try {
          await entrar(page, dono.email, dono.senha);
          await expect(page).toHaveURL(/\/app\/inicio$/);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await expect(bloco).toContainText('Sem data definida');
          await botao(page, 'Alterar').click();
          await page.locator('#data-proxima').fill(futura);
          await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();
          await esperarToast(page, `Próxima graduação agendada para ${diaMes(futura)}.`);
          await expect(bloco).toContainText(diaMes(futura));

          await trocarDeConta(page, aluno);
          await expect(page.locator('app-card-graduacao')).toContainText(`Próxima graduação: ${diaMes(futura)}`);

          await trocarDeConta(page, dono);
          await page.goto('/app/graduacao');
          await botao(page, 'Alterar').click();
          await botao(page, 'Cancelar data').click();
          await responderAlerta(page, 'Cancelar data');
          await esperarToast(page, 'Data da próxima graduação cancelada.');
          await expect(bloco).toContainText('Sem data definida');

          await trocarDeConta(page, aluno);
          await expect(page.locator('app-card-graduacao')).toContainText('Sem data definida para a próxima graduação');
        } finally {
          await cancelarProxima(request, dono);
        }
      });

      test('trocar a data agendada substitui a anterior', async ({ page, request }) => {
        const dono = await criarDono(request);
        const primeira = diaRelativo(8);
        const segunda = diaRelativo(15);
        await cancelarProxima(request, dono);
        const agendar = await request.put(`${URL_API}/graduacoes/proxima`, {
          headers: await autorizacao(request, dono),
          data: { data: primeira }
        });
        expect(agendar.status()).toBe(200);

        try {
          await entrar(page, dono.email, dono.senha);
          await expect(page).toHaveURL(/\/app\/inicio$/);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await expect(bloco).toContainText(diaMes(primeira));
          await botao(page, 'Alterar').click();
          await page.locator('#data-proxima').fill(segunda);
          await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();
          await esperarToast(page, `Próxima graduação agendada para ${diaMes(segunda)}.`);
          await expect(bloco).toContainText(diaMes(segunda));
          await expect(bloco).not.toContainText(diaMes(primeira));
        } finally {
          await cancelarProxima(request, dono);
        }
      });
    });

    test('API: professor e aluno não registram nem agendam', async ({ request }) => {
      const dono = await criarDono(request);
      const professor = await criarContaAtiva(request);
      const aluno = await criarContaAtiva(request);
      const alvo = await criarContaAtiva(request);
      const promocao = await request.put(`${URL_API}/alunos/${await idDe(request, professor)}/perfil`, {
        headers: await autorizacao(request, dono),
        data: { perfil: 'PROFESSOR' }
      });
      expect(promocao.status()).toBe(204);
      const azul = await faixaPorCodigo(request, dono, 'FA');

      for (const autor of [professor, aluno]) {
        const cabecalho = await autorizacao(request, autor);
        expect((await registrarPorApi(request, autor, alvo, { idGraduacao: azul.id, grau: 1 })).status()).toBe(403);
        expect((await request.put(`${URL_API}/graduacoes/proxima`, { headers: cabecalho, data: { data: diaRelativo(5) } })).status()).toBe(403);
        expect((await request.delete(`${URL_API}/graduacoes/proxima`, { headers: cabecalho })).status()).toBe(403);
        expect((await request.get(`${URL_API}/graduacoes/alunos`, { headers: cabecalho })).status()).toBe(403);
      }
    });

    test('API: grau 5 na Faixa Azul é recusado com ERR012', async ({ request }) => {
      const dono = await criarDono(request);
      const aluno = await criarContaAtiva(request);
      const azul = await faixaPorCodigo(request, dono, 'FA');
      expect(azul.grauMax).toBe(4);

      const resposta = await registrarPorApi(request, dono, aluno, { idGraduacao: azul.id, grau: 5 });

      expect(resposta.status()).toBe(422);
      expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR012');
    });

    test('API: data futura no registro é recusada com 400 ERR013', async ({ request }) => {
      const dono = await criarDono(request);
      const aluno = await criarContaAtiva(request);
      const azul = await faixaPorCodigo(request, dono, 'FA');

      const resposta = await registrarPorApi(request, dono, aluno, { idGraduacao: azul.id, grau: 1, data: diaRelativo(3) });

      expect(resposta.status()).toBe(400);
      expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR013');
    });
  });
});
