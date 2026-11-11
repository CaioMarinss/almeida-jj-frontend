import { APIRequestContext, APIResponse, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, nomear, sufixoUnico } from '../suporte/contas';
import { dataDaSemana, diaDaSemanaIso, diaMes, hojeEmSaoPaulo, somarDias } from '../suporte/datas';
import {
  autorizacao,
  AulaCriada,
  avulsaAberta,
  avulsaFechada,
  descartarAulaPorSql,
  descartarPresencasDoAluno,
  exigirAula,
  gradeDoDomingoAberta,
  idDaGrade,
  inserirPresencaNaAula,
  inserirPresencaNaGrade,
  marcarPorApi,
  promoverProfessor,
  removerAvulsa,
  removerGrade
} from '../suporte/presenca';
import { entrar, entrarComoDono, esperarAlerta, responderAlerta } from '../suporte/telas';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const MOTIVO_AULA_FECHADA = 'a aula de teste só tem janela fechada depois de 01:00 (horário de São Paulo)';
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

async function entrarNaChamada(page: Page, conta: Conta): Promise<void> {
  await sairDaSessao(page);
  await entrarComoDono(page, conta.email, conta.senha);
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

async function abrirChamada(page: Page, data: string, idAula: number): Promise<void> {
  await page.goto('/app/chamada');
  await expect(page.locator('.semana .intervalo')).toHaveText('Esta semana');
  for (let semana = dataDaSemana(0, 1); semana > data; semana = somarDias(semana, -7)) {
    await page.getByRole('button', { name: 'Semana anterior', exact: true }).click();
  }
  await page.getByRole('group', { name: 'Dia da aula' }).getByRole('button', { name: rotuloDoDia(data), exact: true }).click();
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
    const aula = exigirAula(await avulsaAberta(request, dono), MOTIVO_SEM_AULA);
    const { inicio, data } = aula;

    try {
      await marcarPorApi(request, colega, aula);
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
      expect((await aulaDoApi(request, aluno, aula)).euVou).toBe(true);

      await vou.click();
      await expect(vou).toHaveAttribute('aria-pressed', 'false');
      await expect(card.locator('.contador')).toHaveText('1 vai');
      const depois = await aulaDoApi(request, aluno, aula);
      expect(depois.euVou).toBe(false);
      expect(depois.vao).toBe(1);
    } finally {
      await removerAvulsa(request, dono, aula);
    }
  });

  test('a Início mostra o card Próxima aula com o botão Vou', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const aula = exigirAula(await avulsaAberta(request, dono), MOTIVO_SEM_AULA);

    try {
      await entrarNoInicio(page, aluno);
      const proxima = page.locator('section.proxima-aula');
      await expect(proxima).toBeVisible();
      await expect(proxima.getByText('Próxima aula', { exact: true })).toBeVisible();
      await expect(proxima.getByRole('button', { name: /^Vou na aula das \d{2}:\d{2}$/ })).toBeVisible();
    } finally {
      await removerAvulsa(request, dono, aula);
    }
  });

  test('presença de aula que já terminou aparece como contada nas abas Aulas e Presença', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const semMarca = await criarContaAtiva(request);
    const aula = exigirAula(await avulsaFechada(request, dono), MOTIVO_AULA_FECHADA);
    const { inicio, data, id } = aula;

    try {
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
    } finally {
      descartarAulaPorSql(aula);
    }
  });

  test('o dono marca e desmarca na chamada em lista', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAlunoNomeado(request, 'Chamada');
    const aula = exigirAula(await avulsaAberta(request, dono), MOTIVO_SEM_AULA);
    const { id, data } = aula;

    try {
      await entrarNaChamada(page, dono);
      await abrirChamada(page, data, id);

      await expect(page.getByRole('heading', { name: 'Presentes · 0' })).toBeVisible();
      await expect(page.getByText('Ninguém registrado nesta aula.')).toBeVisible();
      await page.locator('#busca-chamada').fill(aluno.nome);
      await page.locator('section.outros button.linha').filter({ hasText: aluno.nome }).click();

      await expect(page.getByRole('heading', { name: 'Presentes · 1' })).toBeVisible();
      const presente = page.locator('section.presentes button.linha').filter({ hasText: aluno.nome });
      await expect(presente).toContainText('incluído por você');
      await expect(presente).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('section.outros button.linha').filter({ hasText: aluno.nome })).toHaveCount(0);
      await expect(page.locator(`button.aula[data-id="${id}"] .quantidade`)).toHaveText('1 pres.');

      await presente.click();
      await esperarAlerta(page, `Tirar a presença de ${aluno.nome}?`);
      await responderAlerta(page, 'Tirar');
      await expect(page.getByRole('heading', { name: 'Presentes · 0' })).toBeVisible();
      await expect(page.locator('section.outros button.linha').filter({ hasText: aluno.nome })).toBeVisible();
      await expect(page.locator(`button.aula[data-id="${id}"] .quantidade`)).toHaveText('0 pres.');
    } finally {
      await removerAvulsa(request, dono, aula);
    }
  });

  test('o dono inclui dois alunos em seguida na mesma aula', async ({ page, request }) => {
    const dono = await criarDono(request);
    const prefixo = `Lote${sufixoUnico()}`;
    const primeiro = nomear(await criarContaAtiva(request), `${prefixo} Ana`);
    const segundo = nomear(await criarContaAtiva(request), `${prefixo} Bia`);
    const aula = exigirAula(await avulsaAberta(request, dono), MOTIVO_SEM_AULA);

    try {
      await entrarNaChamada(page, dono);
      await abrirChamada(page, aula.data, aula.id);
      await page.locator('#busca-chamada').fill(prefixo);
      await page.locator('section.outros button.linha').filter({ hasText: primeiro.nome }).click();
      await expect(page.getByRole('heading', { name: 'Presentes · 1' })).toBeVisible();
      await page.locator('section.outros button.linha').filter({ hasText: segundo.nome }).click();

      await expect(page.getByRole('heading', { name: 'Presentes · 2' })).toBeVisible();
      await expect(page.locator('section.presentes button.linha').filter({ hasText: prefixo })).toHaveCount(2);
      await expect(page.locator(`button.aula[data-id="${aula.id}"] .quantidade`)).toHaveText('2 pres.');
    } finally {
      descartarAulaPorSql(aula);
    }
  });

  test('o dono edita a chamada da semana passada e tira a presença depois de confirmar', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAlunoNomeado(request, 'Passada');
    const data = dataDaSemana(-1, 1);
    const idAluno = await idDe(request, aluno);
    inserirPresencaNaGrade(idAluno, 1, '18:00', data);
    const idAula = await idDaGrade(request, dono, 1, '18:00');

    try {
      await entrarNaChamada(page, dono);
      await abrirChamada(page, data, idAula);
      await page.locator('#busca-chamada').fill(aluno.nome);
      const presente = page.locator('section.presentes button.linha').filter({ hasText: aluno.nome });
      await expect(presente).toContainText('marcou Vou');
      await expect(page.getByText('Fora do prazo: estas presenças só podem ser consultadas.')).toHaveCount(0);
      await expect(presente).toBeEnabled();

      await presente.click();
      await esperarAlerta(page, `Tirar a presença de ${aluno.nome}?`);
      await responderAlerta(page, 'Tirar');
      await expect(presente).toHaveCount(0);
      await expect(page.locator('section.outros button.linha').filter({ hasText: aluno.nome })).toBeVisible();
    } finally {
      descartarPresencasDoAluno(idAluno);
    }
  });

  test('as setas da Presenças param no prazo do dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const anterior = page.getByRole('button', { name: 'Semana anterior', exact: true });
    const proxima = page.getByRole('button', { name: 'Próxima semana', exact: true });
    const intervalo = page.locator('.semana .intervalo');

    const prazo = await request.get(`${URL_API}/presencas/prazo`, { headers: await autorizacao(request, dono) });
    expect(prazo.status()).toBe(200);
    const { ajustaDesde } = (await prazo.json()) as { ajustaDesde: string | null };
    const semanaDoPrazo = ajustaDesde === null ? dataDaSemana(-12, 1) : somarDias(ajustaDesde, 1 - diaDaSemanaIso(ajustaDesde));
    const primeira = semanaDoPrazo < dataDaSemana(-1, 1) ? semanaDoPrazo : dataDaSemana(-1, 1);

    await entrarNaChamada(page, dono);
    await expect(intervalo).toHaveText('Esta semana');
    await expect(proxima).toBeDisabled();
    for (let semana = dataDaSemana(0, 1); semana > primeira; semana = somarDias(semana, -7)) {
      await anterior.click();
    }
    await expect(intervalo).toHaveText(`${diaMes(primeira)} a ${diaMes(somarDias(primeira, 6))}`);
    await expect(anterior).toBeDisabled();
    await proxima.click();
    await expect(proxima).toBeEnabled();
  });

  test('o dono inclui o aluno em uma aula da semana passada e a origem aparece como incluída pelo dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarAlunoNomeado(request, 'Incluido');
    const idAluno = await idDe(request, aluno);
    const data = dataDaSemana(-1, 2);
    const idAula = await idDaGrade(request, dono, 2, '18:00');

    try {
      await entrarNaChamada(page, dono);
      await abrirChamada(page, data, idAula);
      await page.locator('#busca-chamada').fill(aluno.nome);
      await page.locator('section.outros button.linha').filter({ hasText: aluno.nome }).click();
      await expect(page.locator('section.presentes button.linha').filter({ hasText: aluno.nome })).toContainText('incluído por você');

      await entrarNoInicio(page, aluno);
      await page.goto('/app/presenca');
      const linha = page.locator('ul.presencas li').filter({ hasText: diaMes(data) });
      await expect(linha).toContainText('incluída pelo dono');
    } finally {
      descartarPresencasDoAluno(idAluno);
    }
  });

  test('o dono cancela uma aula com marcação aberta e a marcação some para o aluno', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const aula = exigirAula(await gradeDoDomingoAberta(request, dono), 'domingo de hoje sem horário livre para criar uma aula com janela de presença aberta');
    const { id, data, inicio } = aula;
    let cancelamento: number | null = null;

    try {
      await marcarPorApi(request, aluno, aula);
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
      const marcada = await aulaDoApi(request, aluno, aula);
      expect(marcada.cancelada).toBe(true);
      expect(marcada.euVou).toBe(false);
      expect(marcada.vao).toBe(0);
    } finally {
      if (cancelamento !== null) {
        await request.delete(`${URL_API}/agenda/cancelamentos/${cancelamento}`, { headers: await autorizacao(request, dono) });
      }
      await removerGrade(request, dono, aula);
    }
  });

  test('aluno e professor não têm a Presenças de gestão e a rota os leva para a Início', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);

    for (const conta of [aluno, professor]) {
      await entrarNoInicio(page, conta);
      await expect(page.locator('ion-menu ion-item, ion-tab-button').filter({ hasText: /^\s*Presenças\s*$/ })).toHaveCount(0);
      await expect(page.locator('section.atalho-chamada')).toHaveCount(0);

      await page.goto('/app/chamada');
      await expect(page).toHaveURL(/\/app\/inicio$/);
      await expect(page.getByRole('button', { name: 'Editar grade', exact: true })).toHaveCount(0);
    }
  });

  test('o dono entra direto na Presenças e Editar grade leva à grade', async ({ page, request }) => {
    const dono = await criarDono(request);

    await entrarNaChamada(page, dono);
    await expect(page.getByRole('group', { name: 'Dia da aula' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar grade', exact: true }).click();

    await expect(page).toHaveURL(/\/app\/grade$/);
  });
});

test.describe('Presença, só desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'não depende da tela');

  test('API: cancelar o dia quando uma aula já fechou a janela é recusado com ERR030', async ({ request }) => {
    const dono = await criarDono(request);
    const aula = exigirAula(await avulsaFechada(request, dono), MOTIVO_AULA_FECHADA);
    let resposta: APIResponse | null = null;

    try {
      resposta = await request.post(`${URL_API}/agenda/cancelamentos`, {
        headers: await autorizacao(request, dono),
        data: { data: hojeEmSaoPaulo(), motivo: 'Teste e2e' }
      });

      expect(resposta.status()).toBe(422);
      expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR030');
    } finally {
      if (resposta?.status() === 201) {
        const { id } = (await resposta.json()) as { id: number };
        await request.delete(`${URL_API}/agenda/cancelamentos/${id}`, { headers: await autorizacao(request, dono) });
      }
      descartarAulaPorSql(aula);
    }
  });

  test('API: aluno não acessa as rotas da chamada', async ({ request }) => {
    const aluno = await criarContaAtiva(request);
    const alvo = await criarContaAtiva(request);
    const headers = await autorizacao(request, aluno);
    const base = `${URL_API}/agenda/${hojeEmSaoPaulo()}/aulas/1/presencas`;

    expect((await request.get(base, { headers })).status()).toBe(403);
    expect((await request.post(base, { headers, data: { idAluno: await idDe(request, alvo) } })).status()).toBe(403);
    expect((await request.delete(`${base}/${await idDe(request, alvo)}`, { headers })).status()).toBe(403);
    expect((await request.get(`${URL_API}/presencas/prazo`, { headers })).status()).toBe(403);
  });

  test('API: professor não acessa a chamada nem a lista de alunos', async ({ request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);
    const alvo = await criarContaAtiva(request);
    const headers = await autorizacao(request, professor);
    const base = `${URL_API}/agenda/${hojeEmSaoPaulo()}/aulas/1/presencas`;

    expect((await request.get(base, { headers })).status()).toBe(403);
    expect((await request.post(base, { headers, data: { idAluno: await idDe(request, alvo) } })).status()).toBe(403);
    expect((await request.delete(`${base}/${await idDe(request, alvo)}`, { headers })).status()).toBe(403);
    expect((await request.get(`${URL_API}/presencas/prazo`, { headers })).status()).toBe(403);
    expect((await request.get(`${URL_API}/alunos`, { headers })).status()).toBe(403);
    expect((await request.get(`${URL_API}/alunos/painel`, { headers })).status()).toBe(403);
  });

  test('API: professor não vê os sumidos nem as presenças de outro aluno', async ({ request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);
    const alvo = await criarContaAtiva(request);
    const headers = await autorizacao(request, professor);

    expect((await request.get(`${URL_API}/presencas/sumidos`, { headers })).status()).toBe(403);
    expect((await request.get(`${URL_API}/graduacoes/alunos/${await idDe(request, alvo)}/presencas`, { headers })).status()).toBe(403);
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
