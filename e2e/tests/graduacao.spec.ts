import { APIRequestContext, expect, Locator, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { executarSql } from '../suporte/banco';
import { Conta, criarContaAtiva, criarDono, idDe, tokenDe } from '../suporte/contas';
import { dataDaSemana } from '../suporte/datas';
import { descartarPresencasDoAluno, inserirPresencaNaGrade } from '../suporte/presenca';
import { botao, entrar, entrarComoDono, esperarAlerta, esperarToast, irParaAba, responderAlerta } from '../suporte/telas';

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

async function agendarPorApi(request: APIRequestContext, dono: Conta, data: string, minimoGrau: number, minimoFaixa: number): Promise<void> {
  const resposta = await request.put(`${URL_API}/graduacoes/proxima`, {
    headers: await autorizacao(request, dono),
    data: { data, minimoGrau, minimoFaixa }
  });
  expect(resposta.status(), await resposta.text()).toBe(200);
}

async function abrirAptos(page: Page): Promise<void> {
  await page.goto('/app/graduacao');
  await expect(page.locator('app-aptos p.resumo')).toBeVisible();
}

async function linhaDoApto(page: Page, aluno: Conta): Promise<Locator> {
  const linha = page.locator('app-aptos li.linha').filter({ hasText: aluno.nome });
  if ((await linha.count()) === 0) {
    await page.locator('app-aptos ion-segment-button').filter({ hasText: /^\s*Troca de faixa/ }).click();
  }
  await expect(linha).toHaveCount(1);
  return linha;
}

async function abrirFicha(page: Page, aluno: Conta): Promise<void> {
  await page.goto('/app/alunos');
  await page.locator('#busca-aluno').fill(aluno.nome);
  const linha = page.locator(`li.aluno[data-email="${aluno.email}"]`);
  await expect(linha).toBeVisible();
  await linha.locator('a.linha').click();
  await expect(page.locator('app-ficha-aluno header.cabeca')).toContainText(aluno.nome);
}

async function abrirAluno(page: Page, aluno: Conta): Promise<void> {
  await abrirFicha(page, aluno);
  await page.locator('app-ficha-aluno ion-segment-button').filter({ hasText: 'Graduações' }).click();
  await expect(page.locator('app-registro-graduacao')).toBeVisible();
}

async function registrarExamePelaTela(
  page: Page,
  resultado: 'Aprovado' | 'Reprovado',
  nota: string,
  observacao?: string
): Promise<void> {
  const folha = page.locator('app-exame');
  await expect(folha).toBeVisible();
  await folha.getByRole('button', { name: resultado, exact: true }).click();
  await folha.locator('#exame-nota').fill(nota);
  if (observacao) {
    await folha.locator('#exame-observacao').fill(observacao);
  }
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

async function trocarDeConta(page: Page, conta: Conta): Promise<void> {
  await sairDaSessao(page);
  await entrar(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/app\/(inicio|chamada)$/);
}

test.describe('Graduação', () => {
  test('a ficha do aluno mostra as presenças dele', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);
    const idAluno = await idDe(request, aluno);
    const data = dataDaSemana(-1, 1);
    inserirPresencaNaGrade(idAluno, 1, '18:00', data);

    try {
      await entrarComoDono(page, dono.email, dono.senha);
      await abrirFicha(page, aluno);
      const bloco = page.locator('app-ficha-aluno app-presencas-aluno');
      await expect(bloco.locator('li').filter({ hasText: diaMes(data) })).toContainText('contada');
    } finally {
      descartarPresencasDoAluno(idAluno);
    }
  });

  test('o dono registra faixa e grau e o aluno acompanha a evolução no início', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);

    await entrarComoDono(page, dono.email, dono.senha);
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

    await entrarComoDono(page, dono.email, dono.senha);
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

    await entrarComoDono(page, dono.email, dono.senha);
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

    await entrarComoDono(page, dono.email, dono.senha);
    await page.goto('/app/alunos');
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
      await page.goto('/app/graduacao');
      await expect(page).toHaveURL(/\/app\/inicio$/);
    }
  });

  test('o dono chega em Graduação pela aba e vê o evento e os aptos', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrarComoDono(page, dono.email, dono.senha);

    await irParaAba(page, 'Graduação');

    await expect(page).toHaveURL(/\/app\/graduacao$/);
    await expect(page.locator('app-proxima-graduacao')).toBeVisible();
    await expect(page.locator('app-aptos')).toBeVisible();
  });

  test('o dono abre a ficha pela lista e volta pela seta', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAluno(request);

    await entrarComoDono(page, dono.email, dono.senha);
    await abrirAluno(page, aluno);
    await page.getByRole('button', { name: 'Voltar para os alunos' }).click();

    await expect(page).toHaveURL(/\/app\/alunos$/);
    await expect(page.locator('#busca-aluno')).toBeVisible();
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('o menu lateral do dono tem Graduação', async ({ page, request }) => {
      const dono = await criarDono(request);
      await entrarComoDono(page, dono.email, dono.senha);

      await page.locator('ion-menu ion-item', { hasText: 'Graduação' }).click();

      await expect(page).toHaveURL(/\/app\/graduacao$/);
    });

    test('conta desativada antes de salvar mostra o erro e a tela continua usável', async ({ page, request }) => {
      const dono = await criarDono(request);
      const aluno = await criarAluno(request);

      await entrarComoDono(page, dono.email, dono.senha);
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

      await page.getByRole('button', { name: 'Voltar para os alunos' }).click();
      await expect(page.locator('#busca-aluno')).toBeVisible();
    });

    test.describe.serial('próxima graduação', () => {
      test('agendar mostra a data ao aluno e cancelar volta ao aviso', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarContaAtiva(request);
        const futura = diaRelativo(10);
        await cancelarProxima(request, dono);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await expect(bloco).toContainText('Sem data definida');
          await botao(page, 'Alterar').click();
          await page.locator('#data-proxima').fill(futura);
          await page.locator('#minimo-grau').fill('10');
          await page.locator('#minimo-faixa').fill('20');
          await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();
          await esperarToast(page, `Próxima graduação agendada para ${diaMes(futura)}.`);
          await expect(bloco).toContainText(diaMes(futura));
          await expect(bloco.locator('.minimos div').filter({ hasText: 'Mínimo p/ grau' })).toContainText('10');
          await expect(bloco.locator('.minimos div').filter({ hasText: 'Mínimo p/ faixa' })).toContainText('20');

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
          await entrarComoDono(page, dono.email, dono.senha);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await expect(bloco).toContainText(diaMes(primeira));
          await botao(page, 'Alterar').click();
          await page.locator('#data-proxima').fill(segunda);
          await page.locator('#minimo-grau').fill('10');
          await page.locator('#minimo-faixa').fill('20');
          await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();
          await esperarToast(page, `Próxima graduação agendada para ${diaMes(segunda)}.`);
          await expect(bloco).toContainText(diaMes(segunda));
          await expect(bloco).not.toContainText(diaMes(primeira));
        } finally {
          await cancelarProxima(request, dono);
        }
      });

      test('a aba Presença do aluno mostra X de Y presenças até a graduação', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarAluno(request);
        const evento = diaRelativo(10);
        const idAluno = await idDe(request, aluno);
        inserirPresencaNaGrade(idAluno, 1, '18:00', dataDaSemana(-1, 1));
        inserirPresencaNaGrade(idAluno, 1, '19:00', dataDaSemana(-1, 1));
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, evento, 5, 8);

        try {
          await trocarDeConta(page, aluno);
          await page.goto('/app/presenca');

          await expect(page.getByRole('heading', { name: `2 de 5 presenças até a graduação de ${diaMes(evento)}` })).toBeVisible();
          await expect(page.getByText('Faltam 3')).toBeVisible();
          const barra = page.getByRole('progressbar', { name: 'Presenças até a graduação' });
          await expect(barra).toHaveAttribute('aria-valuenow', '2');
          await expect(barra).toHaveAttribute('aria-valuemax', '5');
          await expect(page.locator('ul.presencas li')).toHaveCount(2);
          await expect(page.locator('ul.presencas li').first()).toContainText('contada');

          await page.goto('/app/inicio');
          const card = page.locator('app-card-graduacao');
          await expect(card).toContainText('Sem graduação');
          await expect(card).toContainText(`2 de 5 presenças até a graduação de ${diaMes(evento)}`);
        } finally {
          await cancelarProxima(request, dono);
          descartarPresencasDoAluno(idAluno);
        }
      });

      test('antes da data da graduação o apto faz o exame mas o Graduou fica desabilitado', async ({ page, request }) => {
        const dono = await criarDono(request);
        const apto = await criarAluno(request);
        const quase = await criarAluno(request);
        const evento = diaRelativo(3);
        const segunda = dataDaSemana(-1, 1);
        const idApto = await idDe(request, apto);
        const idQuase = await idDe(request, quase);
        inserirPresencaNaGrade(idApto, 1, '18:00', segunda);
        inserirPresencaNaGrade(idApto, 1, '19:00', segunda);
        inserirPresencaNaGrade(idQuase, 1, '18:00', segunda);
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, evento, 2, 2);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await abrirAptos(page);

          await expect(page.locator('app-proxima-graduacao')).toContainText(diaMes(evento));
          const linhaApto = await linhaDoApto(page, apto);
          await expect(linhaApto).toContainText('2/2 · apto');
          await expect(linhaApto.getByRole('button', { name: 'Graduou', exact: true })).toHaveCount(0);
          const linhaQuase = await linhaDoApto(page, quase);
          await expect(linhaQuase).toContainText('faltam 1');

          await linhaApto.getByRole('button', { name: 'Exame', exact: true }).click();
          await registrarExamePelaTela(page, 'Aprovado', '8,5', 'Bom exame');
          await expect(page.locator('app-exame').getByLabel(/^Já registrar a graduação/)).toHaveCount(0);
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${apto.nome} registrado.`);

          await expect(linhaApto).toContainText('Aprovado · nota 8,5');
          await expect(linhaApto.getByRole('button', { name: 'Ver', exact: true })).toBeVisible();
          await expect(linhaApto.getByRole('button', { name: 'Graduou', exact: true })).toBeDisabled();
          await expect(linhaApto).toContainText(`Disponível em ${diaMes(evento)}`);
          await expect(page.locator('app-aptos p.resumo')).toContainText('1 exame feito');
        } finally {
          await cancelarProxima(request, dono);
          descartarPresencasDoAluno(idApto);
          descartarPresencasDoAluno(idQuase);
        }
      });

      test('o dono define os mínimos, registra o exame aprovado com a graduação e o aluno vira Graduado', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarAluno(request);
        const hoje = diaRelativo(0);
        const segunda = dataDaSemana(-1, 1);
        const idAluno = await idDe(request, aluno);
        inserirPresencaNaGrade(idAluno, 1, '18:00', segunda);
        inserirPresencaNaGrade(idAluno, 1, '19:00', segunda);
        await cancelarProxima(request, dono);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await botao(page, 'Alterar').click();
          await page.locator('#data-proxima').fill(hoje);
          const salvar = bloco.getByRole('button', { name: 'Salvar', exact: true });
          await expect(salvar).toBeDisabled();
          await page.locator('#minimo-grau').fill('2');
          await expect(salvar).toBeDisabled();
          await page.locator('#minimo-faixa').fill('2');
          await expect(salvar).toBeEnabled();
          await salvar.click();
          await esperarToast(page, `Próxima graduação agendada para ${diaMes(hoje)}.`);

          await expect(page.locator('app-aptos p.resumo')).toContainText('1 apto');
          await expect(page.locator('app-aptos ion-segment-button').filter({ hasText: /^\s*Troca de grau · \d+/ })).toBeVisible();
          await expect(page.locator('app-aptos ion-segment-button').filter({ hasText: /^\s*Troca de faixa · \d+/ })).toBeVisible();
          const linha = await linhaDoApto(page, aluno);
          await expect(linha).toContainText('2/2 · apto');
          await linha.getByRole('button', { name: 'Exame', exact: true }).click();

          await registrarExamePelaTela(page, 'Aprovado', '8,5', 'Bom exame');
          const graduar = page.locator('app-exame').getByLabel('Já registrar a graduação (Faixa Branca · 1 grau)');
          await expect(graduar).toBeChecked();
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `${aluno.nome} graduou.`);

          await expect(linha.locator('.selo.graduado')).toHaveText('Graduado');
          await expect(linha).not.toHaveClass(/apto/);
          await expect(linha.getByRole('button', { name: 'Graduou', exact: true })).toHaveCount(0);
          await expect(page.locator('app-aptos p.resumo')).toHaveText('0 aptos · 1 exame feito · 1 graduado');
          const graduacao = await graduacaoDe(request, aluno);
          expect(graduacao.atual?.faixa.codigo).toBe('FB');
          expect(graduacao.atual?.grau).toBe(1);
        } finally {
          await cancelarProxima(request, dono);
          descartarPresencasDoAluno(idAluno);
        }
      });

      test('exame aprovado sem graduar libera o Graduou, e o exame reprovado não', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aprovado = await criarAluno(request);
        const reprovado = await criarAluno(request);
        const idAprovado = await idDe(request, aprovado);
        const idReprovado = await idDe(request, reprovado);
        const segunda = dataDaSemana(-1, 1);
        for (const id of [idAprovado, idReprovado]) {
          inserirPresencaNaGrade(id, 1, '18:00', segunda);
          inserirPresencaNaGrade(id, 1, '19:00', segunda);
        }
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, diaRelativo(0), 2, 2);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await abrirAptos(page);

          const linhaAprovado = await linhaDoApto(page, aprovado);
          await linhaAprovado.getByRole('button', { name: 'Exame', exact: true }).click();
          await registrarExamePelaTela(page, 'Aprovado', '10');
          await page.locator('app-exame').getByLabel(/^Já registrar a graduação/).uncheck();
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${aprovado.nome} registrado.`);
          await expect(linhaAprovado).toContainText('Aprovado · nota 10,0');
          await expect(linhaAprovado.getByRole('button', { name: 'Graduou', exact: true })).toBeEnabled();

          const linhaReprovado = await linhaDoApto(page, reprovado);
          await linhaReprovado.getByRole('button', { name: 'Exame', exact: true }).click();
          await registrarExamePelaTela(page, 'Reprovado', '4');
          await expect(page.locator('app-exame').getByLabel(/^Já registrar a graduação/)).toHaveCount(0);
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${reprovado.nome} registrado.`);
          await expect(linhaReprovado).toContainText('Reprovado · nota 4,0');
          await expect(linhaReprovado.getByRole('button', { name: 'Graduou', exact: true })).toHaveCount(0);

          await linhaAprovado.getByRole('button', { name: 'Graduou', exact: true }).click();
          await expect(page.locator('app-aptos .confirmacao')).toContainText(aprovado.nome);
          await page.locator('app-aptos').getByRole('button', { name: 'Confirmar', exact: true }).click();
          await esperarToast(page, `${aprovado.nome} graduou.`);
          await expect(linhaAprovado.locator('.selo.graduado')).toHaveText('Graduado');
        } finally {
          await cancelarProxima(request, dono);
          descartarPresencasDoAluno(idAprovado);
          descartarPresencasDoAluno(idReprovado);
        }
      });

      test('o exame de um aluno ainda não apto é salvo e aparece na ficha dele', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarAluno(request);
        const idAluno = await idDe(request, aluno);
        inserirPresencaNaGrade(idAluno, 1, '18:00', dataDaSemana(-1, 1));
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, diaRelativo(5), 5, 8);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await abrirAptos(page);
          const linha = await linhaDoApto(page, aluno);
          await expect(linha).toContainText('faltam 4');
          await expect(page.locator('app-aptos').getByText('Ainda não aptos')).toBeVisible();

          await linha.getByRole('button', { name: 'Exame', exact: true }).click();
          await registrarExamePelaTela(page, 'Reprovado', '4,0', 'Precisa treinar mais');
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${aluno.nome} registrado.`);
          await expect(linha).toContainText('Reprovado · nota 4,0');

          await abrirFicha(page, aluno);
          await page.locator('app-ficha-aluno ion-segment-button').filter({ hasText: 'Exames' }).click();
          const exames = page.locator('app-exames-aluno');
          await expect(exames).toContainText(diaMes(diaRelativo(5)));
          await expect(exames).toContainText('Reprovado · nota 4,0');
          await expect(exames).toContainText('Precisa treinar mais');
        } finally {
          await cancelarProxima(request, dono);
          descartarPresencasDoAluno(idAluno);
        }
      });

      test('editar e remover o exame pela folha', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarAluno(request);
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, diaRelativo(4), 5, 8);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await abrirAptos(page);
          const linha = await linhaDoApto(page, aluno);
          await linha.getByRole('button', { name: 'Exame', exact: true }).click();
          await registrarExamePelaTela(page, 'Reprovado', '3');
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${aluno.nome} registrado.`);
          await expect(linha).toContainText('Reprovado · nota 3,0');

          await linha.getByRole('button', { name: 'Ver', exact: true }).click();
          await registrarExamePelaTela(page, 'Aprovado', '7,5');
          await botao(page, 'Salvar exame').click();
          await esperarToast(page, `Exame de ${aluno.nome} registrado.`);
          await expect(linha).toContainText('Aprovado · nota 7,5');

          await linha.getByRole('button', { name: 'Ver', exact: true }).click();
          await botao(page, 'Remover exame').click();
          await responderAlerta(page, 'Remover exame');
          await esperarToast(page, 'Exame removido.');
          await expect(linha).not.toContainText('nota');
          await expect(linha.getByRole('button', { name: 'Exame', exact: true })).toBeVisible();
        } finally {
          await cancelarProxima(request, dono);
        }
      });

      test('cancelar a graduação com exame registrado mostra o erro ERR037 e mantém a data', async ({ page, request }) => {
        const dono = await criarDono(request);
        const aluno = await criarAluno(request);
        const evento = diaRelativo(6);
        await cancelarProxima(request, dono);
        await agendarPorApi(request, dono, evento, 5, 8);
        const exame = await request.put(`${URL_API}/graduacoes/aptos/${await idDe(request, aluno)}/exame`, {
          headers: await autorizacao(request, dono),
          data: { aprovado: false, nota: 4 }
        });
        expect(exame.status(), await exame.text()).toBe(200);

        try {
          await entrarComoDono(page, dono.email, dono.senha);
          await page.goto('/app/graduacao');
          const bloco = page.locator('app-proxima-graduacao');
          await botao(page, 'Alterar').click();
          await botao(page, 'Cancelar data').click();
          await responderAlerta(page, 'Cancelar data');

          await esperarAlerta(page, 'Esta graduação tem exames registrados e não pode ser cancelada.');
          await responderAlerta(page, 'OK');
          await page.goto('/app/graduacao');
          await expect(bloco).toContainText(diaMes(evento));
          const resposta = await request.delete(`${URL_API}/graduacoes/proxima`, { headers: await autorizacao(request, dono) });
          expect(resposta.status()).toBe(422);
          expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR037');
        } finally {
          await request.delete(`${URL_API}/graduacoes/aptos/${await idDe(request, aluno)}/exame`, {
            headers: await autorizacao(request, dono)
          });
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
