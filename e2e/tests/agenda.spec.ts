import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, tokenDe } from '../suporte/contas';
import { dataDaSemana, diaMes, somarDias, hojeEmSaoPaulo } from '../suporte/datas';
import { botao, entrar, esperarToast, responderAlerta } from '../suporte/telas';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SEGUNDA = 1;
const TERCA = 2;
const QUARTA = 3;
const QUINTA = 4;
const SEXTA = 5;
const DOMINGO = 7;

interface ExcecaoApi {
  tipo: 'DIA' | 'AULA' | 'AVULSA';
  id: number;
  data: string;
}

interface AulaGradeApi {
  id: number;
  diaSemana: number;
  inicio: string;
}

function semanasAFrente(projeto: string): number {
  return projeto === 'celular' ? 2 : 1;
}

async function autorizacao(request: APIRequestContext, conta: Conta): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await tokenDe(request, conta)}` };
}

async function promoverPorApi(request: APIRequestContext, dono: Conta, alvo: Conta): Promise<void> {
  const resposta = await request.put(`${URL_API}/alunos/${await idDe(request, alvo)}/perfil`, {
    headers: await autorizacao(request, dono),
    data: { perfil: 'PROFESSOR' }
  });
  expect(resposta.status()).toBe(204);
}

async function limparExcecoes(request: APIRequestContext, dono: Conta, data: string): Promise<void> {
  const headers = await autorizacao(request, dono);
  const resposta = await request.get(`${URL_API}/agenda/excecoes`, { headers });
  const todas = (await resposta.json()) as ExcecaoApi[];
  for (const e of todas.filter(x => x.data === data)) {
    const caminho = e.tipo === 'AVULSA' ? 'avulsas' : 'cancelamentos';
    await request.delete(`${URL_API}/agenda/${caminho}/${e.id}`, { headers });
  }
}

async function limparGrade(request: APIRequestContext, dono: Conta, diaSemana: number, horarios: string[]): Promise<void> {
  const headers = await autorizacao(request, dono);
  const resposta = await request.get(`${URL_API}/aulas/grade`, { headers });
  const aulas = (await resposta.json()) as AulaGradeApi[];
  for (const a of aulas.filter(x => x.diaSemana === diaSemana && horarios.includes(x.inicio.slice(0, 5)))) {
    await request.delete(`${URL_API}/aulas/grade/${a.id}`, { headers });
  }
}

async function sairDaSessao(page: Page): Promise<void> {
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => sessionStorage.clear());
  }
}

async function entrarNoInicio(page: Page, conta: Conta): Promise<void> {
  await entrar(page, conta.email, conta.senha);
  await expect(page).toHaveURL(/\/app\/inicio$/);
}

async function verDiaComoAluno(page: Page, conta: Conta, semanas: number, data: string, diaSemana: number): Promise<void> {
  await sairDaSessao(page);
  await entrarNoInicio(page, conta);
  await page.goto('/app/aulas');
  for (let i = 0; i < semanas; i++) {
    await page.getByRole('button', { name: 'Próxima semana', exact: true }).click();
  }
  await page.getByRole('button', { name: `${NOMES_DIAS[diaSemana - 1]}, ${diaMes(data)}`, exact: true }).click();
}

async function irParaAba(page: Page, nome: string): Promise<void> {
  await page.locator('ion-menu ion-item, ion-tab-button').filter({ hasText: nome }).locator('visible=true').first().click();
}

async function abrirAgendaComoDono(page: Page, dono: Conta, aba: 'Grade semanal' | 'Exceções'): Promise<void> {
  await sairDaSessao(page);
  await entrarNoInicio(page, dono);
  await page.goto('/app/agenda');
  await expect(page.getByRole('heading', { name: 'Agenda' }).or(page.locator('ion-title', { hasText: 'Agenda' })).first()).toBeVisible();
  await page.locator('ion-segment-button').filter({ hasText: aba }).click();
}

async function abrirGradeDoDomingo(page: Page, dono: Conta): Promise<void> {
  await abrirAgendaComoDono(page, dono, 'Grade semanal');
  await page.getByRole('group', { name: 'Dia da semana' }).getByRole('button', { name: 'domingo', exact: true }).click();
}

function painel(page: Page) {
  return page.locator('ion-modal');
}

async function salvarNoPainel(page: Page): Promise<void> {
  await painel(page).getByRole('button', { name: 'Salvar', exact: true }).click();
}

async function desfazerExcecao(page: Page, data: string): Promise<void> {
  await page.getByRole('button', { name: `Desfazer exceção de ${diaMes(data)}`, exact: true }).click();
  await responderAlerta(page, 'Desfazer');
  await esperarToast(page, 'Exceção desfeita.');
}

function cartao(page: Page, hora: string) {
  return page.locator('app-aula-card').filter({ has: page.locator('.hora strong', { hasText: new RegExp(`^${hora}$`) }) });
}

test.describe('Agenda de aulas', () => {
  test('o aluno vê a grade do seed na segunda', async ({ page, request }, info) => {
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, SEGUNDA);
    const aluno = await criarContaAtiva(request);

    await verDiaComoAluno(page, aluno, semanas, data, SEGUNDA);

    const cartoes = page.locator('app-aula-card');
    await expect(cartoes).toHaveCount(4);
    for (const hora of ['07:10', '18:00', '19:00', '20:30']) {
      await expect(cartao(page, hora)).toContainText('Gi');
    }
    await expect(cartao(page, '18:00')).toContainText('até 19:00');
  });

  test('o dono cancela uma aula com motivo, o aluno vê e o dono desfaz', async ({ page, request }, info) => {
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, TERCA);
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const motivo = 'Reforma do tatame';

    try {
      await abrirAgendaComoDono(page, dono, 'Exceções');
      await botao(page, '+ Nova exceção').click();
      await painel(page).locator('button.tipo').filter({ hasText: 'Cancelar uma aula' }).click();
      await painel(page).locator('#excecao-data').fill(data);
      await painel(page).getByRole('group', { name: 'Aula' }).getByRole('button', { name: /^18:00/ }).click();
      await painel(page).locator('#excecao-motivo').fill(motivo);
      await salvarNoPainel(page);
      await esperarToast(page, 'Exceção criada.');

      await verDiaComoAluno(page, aluno, semanas, data, TERCA);
      await expect(cartao(page, '18:00')).toContainText(`Cancelada · ${motivo}`);
      await expect(cartao(page, '19:30')).not.toContainText('Cancelada');

      await abrirAgendaComoDono(page, dono, 'Exceções');
      await desfazerExcecao(page, data);

      await verDiaComoAluno(page, aluno, semanas, data, TERCA);
      await expect(cartao(page, '18:00')).toBeVisible();
      await expect(page.locator('app-aula-card').filter({ hasText: 'Cancelada' })).toHaveCount(0);
    } finally {
      await limparExcecoes(request, dono, data);
    }
  });

  test('o dono cancela o dia inteiro, o aluno vê o aviso e o dono desfaz', async ({ page, request }, info) => {
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, QUARTA);
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const motivo = 'Feriado municipal';

    try {
      await abrirAgendaComoDono(page, dono, 'Exceções');
      await botao(page, '+ Nova exceção').click();
      await painel(page).locator('button.tipo').filter({ hasText: 'Cancelar o dia inteiro' }).click();
      await painel(page).locator('#excecao-data').fill(data);
      await painel(page).locator('#excecao-motivo').fill(motivo);
      await salvarNoPainel(page);
      await esperarToast(page, 'Exceção criada.');

      await verDiaComoAluno(page, aluno, semanas, data, QUARTA);
      const aviso = page.locator('.aviso');
      await expect(aviso).toContainText('Dia sem aula');
      await expect(aviso).toContainText(motivo);
      const cartoes = page.locator('app-aula-card');
      await expect(cartoes).toHaveCount(5);
      await expect(cartoes.filter({ hasText: 'Cancelada' })).toHaveCount(5);

      await abrirAgendaComoDono(page, dono, 'Exceções');
      await desfazerExcecao(page, data);

      await verDiaComoAluno(page, aluno, semanas, data, QUARTA);
      await expect(cartoes).toHaveCount(5);
      await expect(page.locator('.aviso')).toHaveCount(0);
      await expect(cartoes.filter({ hasText: 'Cancelada' })).toHaveCount(0);
    } finally {
      await limparExcecoes(request, dono, data);
    }
  });

  test('o aluno que já está na aba Aulas vê o cancelamento ao voltar para ela', async ({ page, request }, info) => {
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, SEXTA);
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);

    try {
      await verDiaComoAluno(page, aluno, semanas, data, SEXTA);
      await expect(cartao(page, '18:00')).toBeVisible();
      await expect(page.locator('app-aula-card').filter({ hasText: 'Cancelada' })).toHaveCount(0);

      const resposta = await request.post(`${URL_API}/agenda/cancelamentos`, {
        headers: await autorizacao(request, dono),
        data: { data, motivo: 'Treino fechado' }
      });
      expect(resposta.status()).toBe(201);

      await irParaAba(page, 'Perfil');
      await expect(page).toHaveURL(/\/app\/perfil$/);
      await irParaAba(page, 'Aulas');
      await expect(page).toHaveURL(/\/app\/aulas$/);

      await expect(page.locator('app-aula-card').filter({ hasText: 'Cancelada' })).toHaveCount(2);
    } finally {
      await limparExcecoes(request, dono, data);
    }
  });

  test('o dono cria uma aula avulsa, o aluno vê a etiqueta e o dono remove', async ({ page, request }, info) => {
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, QUINTA);
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const motivo = 'Aulão de domingo';

    try {
      await abrirAgendaComoDono(page, dono, 'Exceções');
      await botao(page, '+ Nova exceção').click();
      await painel(page).locator('button.tipo').filter({ hasText: 'Aula avulsa' }).click();
      await painel(page).locator('#excecao-data').fill(data);
      await painel(page).locator('#excecao-inicio').fill('10:30');
      await painel(page).locator('#excecao-fim').fill('11:30');
      await painel(page).getByRole('button', { name: 'No-Gi', exact: true }).click();
      await painel(page).locator('#excecao-motivo').fill(motivo);
      await salvarNoPainel(page);
      await esperarToast(page, 'Exceção criada.');

      await verDiaComoAluno(page, aluno, semanas, data, QUINTA);
      await expect(cartao(page, '10:30')).toContainText('Avulsa');
      await expect(cartao(page, '10:30')).toContainText('No-Gi');
      await expect(cartao(page, '10:30')).toContainText('até 11:30');

      await abrirAgendaComoDono(page, dono, 'Exceções');
      await desfazerExcecao(page, data);

      await verDiaComoAluno(page, aluno, semanas, data, QUINTA);
      await expect(cartao(page, '18:00')).toBeVisible();
      await expect(cartao(page, '10:30')).toHaveCount(0);
    } finally {
      await limparExcecoes(request, dono, data);
    }
  });

  test('o dono adiciona, edita e tira da grade uma aula e o aluno acompanha', async ({ page, request }, info) => {
    test.setTimeout(120_000);
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, DOMINGO);
    const celular = info.project.name === 'celular';
    const inicioNovo = celular ? '06:30' : '06:00';
    const inicioEditado = celular ? '06:45' : '06:15';
    const fimNovo = celular ? '07:30' : '07:00';
    const fimEditado = celular ? '07:45' : '07:15';
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);

    try {
      await abrirGradeDoDomingo(page, dono);
      await botao(page, '+ Aula no domingo').click();
      await painel(page).locator('#aula-inicio').fill(inicioNovo);
      await painel(page).locator('#aula-fim').fill(fimNovo);
      await painel(page).getByRole('button', { name: 'Teens', exact: true }).click();
      await salvarNoPainel(page);
      await esperarToast(page, 'Aula adicionada.');

      await verDiaComoAluno(page, aluno, semanas, data, DOMINGO);
      await expect(cartao(page, inicioNovo)).toContainText('Teens');

      await abrirGradeDoDomingo(page, dono);
      await page.getByRole('button', { name: `Editar aula das ${inicioNovo}`, exact: true }).click();
      await painel(page).locator('#aula-inicio').fill(inicioEditado);
      await painel(page).locator('#aula-fim').fill(fimEditado);
      await salvarNoPainel(page);
      await esperarToast(page, 'Aula alterada a partir de amanhã.');

      await verDiaComoAluno(page, aluno, semanas, data, DOMINGO);
      await expect(cartao(page, inicioEditado)).toContainText(`até ${fimEditado}`);
      await expect(cartao(page, inicioNovo)).toHaveCount(0);

      await abrirGradeDoDomingo(page, dono);
      await page.getByRole('button', { name: `Editar aula das ${inicioEditado}`, exact: true }).click();
      await painel(page).getByRole('button', { name: 'Tirar da grade', exact: true }).click();
      await responderAlerta(page, 'Tirar da grade');
      await esperarToast(page, 'Aula tirada da grade.');
    } finally {
      await limparGrade(request, dono, DOMINGO, [inicioNovo, inicioEditado]);
    }
  });

  test('o dono tira uma aula da grade e o aluno deixa de vê-la', async ({ page, request }, info) => {
    test.setTimeout(120_000);
    const semanas = semanasAFrente(info.project.name);
    const data = dataDaSemana(semanas, DOMINGO);
    const inicio = info.project.name === 'celular' ? '05:30' : '05:00';
    const fim = info.project.name === 'celular' ? '06:30' : '06:00';
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);

    try {
      await abrirGradeDoDomingo(page, dono);
      await botao(page, '+ Aula no domingo').click();
      await painel(page).locator('#aula-inicio').fill(inicio);
      await painel(page).locator('#aula-fim').fill(fim);
      await salvarNoPainel(page);
      await esperarToast(page, 'Aula adicionada.');

      await verDiaComoAluno(page, aluno, semanas, data, DOMINGO);
      await expect(cartao(page, inicio)).toBeVisible();

      await abrirGradeDoDomingo(page, dono);
      await page.getByRole('button', { name: `Editar aula das ${inicio}`, exact: true }).click();
      await painel(page).getByRole('button', { name: 'Tirar da grade', exact: true }).click();
      await responderAlerta(page, 'Tirar da grade');
      await esperarToast(page, 'Aula tirada da grade.');

      await verDiaComoAluno(page, aluno, semanas, data, DOMINGO);
      await expect(page.getByLabel('Carregando aulas')).toHaveCount(0);
      await expect(cartao(page, inicio)).toHaveCount(0);
    } finally {
      await limparGrade(request, dono, DOMINGO, [inicio]);
    }
  });

  test('aluno e professor não veem a Agenda e são redirecionados', async ({ page, request }, info) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverPorApi(request, dono, professor);
    const aluno = await criarContaAtiva(request);

    for (const conta of [aluno, professor]) {
      await sairDaSessao(page);
      await entrarNoInicio(page, conta);
      if (!info.project.name.includes('celular')) {
        await expect(page.locator('ion-menu').getByText('Perfil', { exact: true })).toBeVisible();
        await expect(page.locator('ion-menu').getByText('Agenda', { exact: true })).toHaveCount(0);
      }
      await expect(page.locator('app-area-dono')).toHaveCount(0);

      await page.goto('/app/perfil');
      await expect(page.getByRole('button', { name: 'Gerenciar agenda' })).toHaveCount(0);

      await page.goto('/app/agenda');
      await expect(page).toHaveURL(/\/app\/inicio$/);
    }
  });

  test('o dono chega na Agenda pelo atalho e pelo Perfil', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrarNoInicio(page, dono);

    await page.locator('app-area-dono').getByRole('button', { name: 'Agenda', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/agenda$/);

    await page.goto('/app/perfil');
    await page.getByRole('button', { name: 'Gerenciar agenda', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/agenda$/);
  });
});

test.describe('Agenda de aulas, só desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'não depende da tela');

  test('API: aluno e professor não alteram a grade nem cancelam aulas', async ({ request }) => {
    const dono = await criarDono(request);
    const professor = await criarContaAtiva(request);
    await promoverPorApi(request, dono, professor);
    const aluno = await criarContaAtiva(request);
    const amanha = somarDias(hojeEmSaoPaulo(), 1);

    for (const conta of [aluno, professor]) {
      const headers = await autorizacao(request, conta);
      const grade = await request.post(`${URL_API}/aulas/grade`, {
        headers,
        data: { diaSemana: 7, inicio: '05:00', fim: '06:00', modalidade: 'GI' }
      });
      expect(grade.status()).toBe(403);
      const cancelamento = await request.post(`${URL_API}/agenda/cancelamentos`, { headers, data: { data: amanha } });
      expect(cancelamento.status()).toBe(403);
    }
  });

  test('API: cancelamento com data passada responde 400 ERR018', async ({ request }) => {
    const dono = await criarDono(request);
    const ontem = somarDias(hojeEmSaoPaulo(), -1);

    const resposta = await request.post(`${URL_API}/agenda/cancelamentos`, {
      headers: await autorizacao(request, dono),
      data: { data: ontem }
    });
    expect(resposta.status()).toBe(400);
    expect(((await resposta.json()) as { codigo: string }).codigo).toBe('ERR018');
  });
});
