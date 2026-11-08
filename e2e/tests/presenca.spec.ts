import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, nomear, sufixoUnico } from '../suporte/contas';
import { dataDaSemana, diaDaSemanaIso, diaMes, hojeEmSaoPaulo } from '../suporte/datas';
import {
  autorizacao,
  AulaCriada,
  avulsaAberta,
  avulsaFechada,
  gradeDoDomingoAberta,
  idDaGrade,
  inserirPresencaNaAula,
  inserirPresencaNaGrade,
  marcarPorApi,
  promoverProfessor,
  removerAvulsa,
  removerGrade
} from '../suporte/presenca';
import { entrar, esperarAlerta, esperarToast, responderAlerta } from '../suporte/telas';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MOTIVO_SEM_AULA = 'sem horário livre hoje para criar uma aula com a janela de presença aberta';

async function sairDaSessao(page: Page): Promise<void> {
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => sessionStorage.clear());
  }
}

async function entrarNoInicio(page: Page, conta: Conta): Promise<void> {
  await sairDaSessao(page);
  await entrar(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/app\/inicio$/);
}

async function criarAlunoNomeado(request: APIRequestContext, prefixo: string): Promise<Conta> {
  return nomear(await criarContaAtiva(request), `${prefixo}${sufixoUnico()}`);
}

function cartao(page: Page, hora: string) {
  return page.locator('app-aula-card').filter({ has: page.locator('.hora strong', { hasText: new RegExp(`^${hora}$`) }) });
}

async function abrirDiaDasAulas(page: Page, data: string): Promise<void> {
  await page.goto('/app/aulas');
  await page.locator('.dias').getByRole('button', { name: rotuloDoDia(data), exact: true }).click();
}

async function abrirChamada(page: Page, rotuloDia: string, idAula: number): Promise<void> {
  await page.goto('/app/chamada');
  await page.getByRole('group', { name: 'Dia da chamada' }).getByRole('button', { name: rotuloDia, exact: true }).click();
  await page.locator(`button.aula[data-id="${idAula}"]`).click();
}

function rotuloDoDia(data: string): string {
  return `${NOMES_DIAS[diaDaSemanaIso(data) - 1]}, ${diaMes(data)}`;
}

async function aulaDoApi(request: APIRequestContext, conta: Conta, aula: AulaCriada): Promise<{ euVou: boolean; vao: number; cancelada: boolean }> {
  const resposta = await request.get(`${URL_API}/agenda?inicio=${aula.data}&fim=${aula.data}`, { headers: await autorizacao(request, conta) });
  expect(resposta.status()).toBe(200);
  const dias = (await resposta.json()) as { aulas: { id: number; euVou: boolean; vao: number; cancelada: boolean }[] }[];
  const encontrada = dias[0].aulas.find(a => a.id === aula.id);
  expect(encontrada).toBeDefined();
  return encontrada as { euVou: boolean; vao: number; cancelada: boolean };
}

test.describe('Presença', () => {
  test('o aluno marca Vou, o contador sobe e ele desmarca', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const colega = await criarContaAtiva(request);
    const aula = await avulsaAberta(request, dono);
    test.skip(!aula, MOTIVO_SEM_AULA);
    const { inicio, data } = aula as AulaCriada;

    try {
      await marcarPorApi(request, colega, aula as AulaCriada);
      await entrarNoInicio(page, aluno);
      await abrirDiaDasAulas(page, data);

      const card = cartao(page, inicio);
      const vou = card.getByRole('button', { name: `Vou na aula das ${inicio}`, exact: true });
      await expect(card.locator('.contador')).toHaveText('1 vai');
      await expect(vou).toHaveAttribute('aria-pressed', 'false');
      await expect(vou).toHaveText('Vou');

      await vou.click();
      await expect(vou).toHaveAttribute('aria-pressed', 'true');
      await expect(vou).toHaveText('✓ Vou');
      await expect(card.locator('.contador')).toHaveText('2 vão');
      expect((await aulaDoApi(request, aluno, aula as AulaCriada)).euVou).toBe(true);

      await vou.click();
      await expect(vou).toHaveAttribute('aria-pressed', 'false');
      await expect(card.locator('.contador')).toHaveText('1 vai');
      const depois = await aulaDoApi(request, aluno, aula as AulaCriada);
      expect(depois.euVou).toBe(false);
      expect(depois.vao).toBe(1);
    } finally {
      await removerAvulsa(request, dono, aula as AulaCriada);
    }
  });

  test('a Início mostra o card Próxima aula com o botão Vou', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const aula = await avulsaAberta(request, dono);
    test.skip(!aula, MOTIVO_SEM_AULA);

    try {
      await entrarNoInicio(page, aluno);
      const proxima = page.locator('section.proxima-aula');
      await expect(proxima).toBeVisible();
      await expect(proxima.getByText('Próxima aula', { exact: true })).toBeVisible();
      await expect(proxima.getByRole('button', { name: /^Vou na aula das \d{2}:\d{2}$/ })).toBeVisible();
    } finally {
      await removerAvulsa(request, dono, aula as AulaCriada);
    }
  });

  test('presença de aula que já terminou aparece como contada nas abas Aulas e Presença', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const semMarca = await criarContaAtiva(request);
    const aula = await avulsaFechada(request, dono);
    test.skip(!aula, 'a aula de teste só tem janela fechada depois de 01:00 (horário de São Paulo)');
    const { inicio, data, id } = aula as AulaCriada;
    inserirPresencaNaAula(await idDe(request, aluno), id, data);

    await entrarNoInicio(page, aluno);
    await abrirDiaDasAulas(page, data);
    const card = cartao(page, inicio);
    await expect(card.locator('.situacao')).toHaveText('Presença contada');
    await expect(card.getByRole('button', { name: `Vou na aula das ${inicio}` })).toHaveCount(0);
    await expect(card.locator('.contador')).toHaveText('1 vai');

    await page.goto('/app/presenca');
    const linha = page.locator('ul.presencas li').filter({ hasText: inicio });
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText('contada');
    await expect(linha).toContainText(diaMes(data));

    await entrarNoInicio(page, semMarca);
    await abrirDiaDasAulas(page, data);
    await expect(cartao(page, inicio).locator('.situacao')).toHaveText('Janela fechada');
  });

  test('o professor inclui e tira um aluno da chamada dentro do prazo', async ({ page, request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);
    const aluno = await criarAlunoNomeado(request, 'Chamada');
    const aula = await avulsaAberta(request, dono);
    test.skip(!aula, MOTIVO_SEM_AULA);
    const { id, data } = aula as AulaCriada;

    try {
      await entrarNoInicio(page, professor);
      await abrirChamada(page, rotuloDoDia(data), id);

      await expect(page.getByText(/Professor pode ajustar até \d{2}\/\d{2}/)).toBeVisible();
      await expect(page.getByText('Ninguém registrado nesta aula.')).toBeVisible();
      await page.getByRole('button', { name: '+ Incluir aluno', exact: true }).click();
      await page.locator('#busca-incluir').fill(aluno.nome);
      await page.locator('app-incluir-aluno button.pessoa').filter({ hasText: aluno.nome }).click();
      await esperarToast(page, `${aluno.nome} entrou na chamada.`);

      const linha = page.locator('li.presente').filter({ hasText: aluno.nome });
      await expect(linha).toContainText('incluída pelo professor');
      await expect(page.locator(`button.aula[data-id="${id}"] .quantidade`)).toHaveText('1 presença');

      await page.getByRole('button', { name: `Tirar ${aluno.nome}`, exact: true }).click();
      await esperarAlerta(page, `Tirar ${aluno.nome} desta aula?`);
      await responderAlerta(page, 'Tirar');
      await esperarToast(page, `${aluno.nome} saiu da chamada.`);
      await expect(page.getByText('Ninguém registrado nesta aula.')).toBeVisible();
      await expect(page.locator(`button.aula[data-id="${id}"] .quantidade`)).toHaveText('0 presenças');
    } finally {
      await removerAvulsa(request, dono, aula as AulaCriada);
    }
  });

  test('a chamada da semana passada é só leitura para o professor e editável para o dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);
    const aluno = await criarAlunoNomeado(request, 'Passada');
    const data = dataDaSemana(-1, 1);
    inserirPresencaNaGrade(await idDe(request, aluno), 1, '18:00', data);
    const idAula = await idDaGrade(request, dono, 1, '18:00');

    await entrarNoInicio(page, professor);
    await abrirChamada(page, rotuloDoDia(data), idAula);
    await expect(page.locator('li.presente').filter({ hasText: aluno.nome })).toContainText('contada');
    await expect(page.getByText('Fora do prazo: esta chamada só pode ser consultada.')).toBeVisible();
    await expect(page.getByRole('button', { name: `Tirar ${aluno.nome}`, exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Incluir aluno', exact: true })).toHaveCount(0);

    await entrarNoInicio(page, dono);
    await abrirChamada(page, rotuloDoDia(data), idAula);
    await expect(page.getByText('Fora do prazo: esta chamada só pode ser consultada.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Incluir aluno', exact: true })).toBeVisible();
    await page.getByRole('button', { name: `Tirar ${aluno.nome}`, exact: true }).click();
    await responderAlerta(page, 'Tirar');
    await esperarToast(page, `${aluno.nome} saiu da chamada.`);
    await expect(page.locator('li.presente').filter({ hasText: aluno.nome })).toHaveCount(0);
  });

  test('o dono inclui o aluno em uma aula da semana passada e a origem aparece como incluída pelo dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAlunoNomeado(request, 'Incluido');
    const data = dataDaSemana(-1, 2);
    const idAula = await idDaGrade(request, dono, 2, '18:00');

    await entrarNoInicio(page, dono);
    await abrirChamada(page, rotuloDoDia(data), idAula);
    await page.getByRole('button', { name: '+ Incluir aluno', exact: true }).click();
    await page.locator('#busca-incluir').fill(aluno.nome);
    await page.locator('app-incluir-aluno button.pessoa').filter({ hasText: aluno.nome }).click();
    await esperarToast(page, `${aluno.nome} entrou na chamada.`);
    await expect(page.locator('li.presente').filter({ hasText: aluno.nome })).toContainText('incluída pelo dono');

    await entrarNoInicio(page, aluno);
    await page.goto('/app/presenca');
    const linha = page.locator('ul.presencas li').filter({ hasText: diaMes(data) });
    await expect(linha).toContainText('incluída pelo dono');
  });

  test('o dono cancela uma aula com marcação aberta e a marcação some para o aluno', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const aula = await gradeDoDomingoAberta(request, dono);
    test.skip(!aula, 'domingo de hoje sem horário livre para criar uma aula com janela de presença aberta');
    const { id, data, inicio } = aula as AulaCriada;
    let cancelamento: number | null = null;

    try {
      await marcarPorApi(request, aluno, aula as AulaCriada);
      await entrarNoInicio(page, aluno);
      await abrirDiaDasAulas(page, data);
      const card = cartao(page, inicio);
      await expect(card.getByRole('button', { name: `Vou na aula das ${inicio}` })).toHaveAttribute('aria-pressed', 'true');
      await expect(card.locator('.contador')).toHaveText('1 vai');

      const resposta = await request.post(`${URL_API}/agenda/cancelamentos`, {
        headers: await autorizacao(request, dono),
        data: { data, idAula: id, motivo: 'Teste e2e' }
      });
      expect(resposta.status(), await resposta.text()).toBe(201);
      cancelamento = ((await resposta.json()) as { id: number }).id;

      await abrirDiaDasAulas(page, data);
      await expect(card).toContainText('Cancelada · Teste e2e');
      await expect(card.getByRole('button', { name: `Vou na aula das ${inicio}` })).toHaveCount(0);
      await expect(card.locator('.contador')).toHaveCount(0);
      const marcada = await aulaDoApi(request, aluno, aula as AulaCriada);
      expect(marcada.cancelada).toBe(true);
      expect(marcada.euVou).toBe(false);
      expect(marcada.vao).toBe(0);
    } finally {
      if (cancelamento !== null) {
        await request.delete(`${URL_API}/agenda/cancelamentos/${cancelamento}`, { headers: await autorizacao(request, dono) });
      }
      await removerGrade(request, dono, aula as AulaCriada);
    }
  });

  test('o aluno não vê a Chamada no menu nem na Início e a rota o leva para a Início', async ({ page, request }) => {
    const aluno = await criarContaAtiva(request);

    await entrarNoInicio(page, aluno);
    await expect(page.locator('ion-menu ion-item').filter({ hasText: 'Chamada' })).toHaveCount(0);
    await expect(page.locator('section.atalho-chamada')).toHaveCount(0);

    await page.goto('/app/chamada');
    await expect(page).toHaveURL(/\/app\/inicio$/);
  });

  test('o professor chega na Chamada pelo atalho da Início', async ({ page, request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);

    await entrarNoInicio(page, professor);
    await page.locator('section.atalho-chamada').getByRole('button', { name: 'Chamada', exact: true }).click();

    await expect(page).toHaveURL(/\/app\/chamada$/);
    await expect(page.getByRole('group', { name: 'Dia da chamada' })).toBeVisible();
  });
});

test.describe('Presença, só desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'não depende da tela');

  test('API: cancelar o dia quando uma aula já fechou a janela é recusado com ERR030', async ({ request }) => {
    const dono = await criarDono(request);
    const aula = await avulsaFechada(request, dono);
    test.skip(!aula, 'a aula de teste só tem janela fechada depois de 01:00 (horário de São Paulo)');

    const resposta = await request.post(`${URL_API}/agenda/cancelamentos`, {
      headers: await autorizacao(request, dono),
      data: { data: hojeEmSaoPaulo(), motivo: 'Teste e2e' }
    });

    expect(resposta.status()).toBe(422);
    expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR030');
  });

  test('API: aluno não acessa as rotas da chamada', async ({ request }) => {
    const aluno = await criarContaAtiva(request);
    const alvo = await criarContaAtiva(request);
    const headers = await autorizacao(request, aluno);
    const base = `${URL_API}/agenda/${hojeEmSaoPaulo()}/aulas/1/presencas`;

    expect((await request.get(base, { headers })).status()).toBe(403);
    expect((await request.post(base, { headers, data: { idAluno: await idDe(request, alvo) } })).status()).toBe(403);
    expect((await request.delete(`${base}/${await idDe(request, alvo)}`, { headers })).status()).toBe(403);
  });

  test('API: professor não acessa os aptos nem registra o Graduou', async ({ request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);
    const alvo = await criarContaAtiva(request);
    const headers = await autorizacao(request, professor);

    expect((await request.get(`${URL_API}/graduacoes/aptos`, { headers })).status()).toBe(403);
    expect((await request.post(`${URL_API}/graduacoes/aptos/${await idDe(request, alvo)}`, { headers })).status()).toBe(403);
  });

  test('API: marcar uma aula fora da semana atual responde ERR025', async ({ request }) => {
    const aluno = await criarContaAtiva(request);
    const headers = await autorizacao(request, aluno);

    for (const semana of [-1, 1]) {
      const resposta = await request.post(`${URL_API}/agenda/${dataDaSemana(semana, 1)}/aulas/1/presenca`, { headers });
      expect(resposta.status()).toBe(422);
      expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR025');
    }
  });
});
