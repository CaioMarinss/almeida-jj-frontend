import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, nomear, sufixoUnico, tokenDe } from '../suporte/contas';
import { botao, entrar, esperarToast, responderAlerta } from '../suporte/telas';

interface Faixa {
  id: number;
  codigo: string;
}

interface Registro {
  id: number;
}

async function autorizacao(request: APIRequestContext, conta: Conta): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await tokenDe(request, conta)}` };
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

function diaRelativo(dias: number): string {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const [ano, mes, dia] = hoje.split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

async function promoverPorApi(request: APIRequestContext, dono: Conta, alvo: Conta): Promise<void> {
  const resposta = await request.put(`${URL_API}/alunos/${await idDe(request, alvo)}/perfil`, {
    headers: await autorizacao(request, dono),
    data: { perfil: 'PROFESSOR' }
  });
  expect(resposta.status()).toBe(204);
}

async function faixaPorCodigo(request: APIRequestContext, conta: Conta, codigo: string): Promise<Faixa> {
  const resposta = await request.get(`${URL_API}/graduacoes/faixas`, { headers: await autorizacao(request, conta) });
  const faixa = ((await resposta.json()) as Faixa[]).find(f => f.codigo === codigo);
  expect(faixa, codigo).toBeDefined();
  return faixa as Faixa;
}

async function registrarPorApi(
  request: APIRequestContext,
  dono: Conta,
  alvo: Conta,
  idGraduacao: number,
  grau: number,
  data: string
): Promise<Registro> {
  const resposta = await request.post(`${URL_API}/alunos/${await idDe(request, alvo)}/graduacoes`, {
    headers: await autorizacao(request, dono),
    data: { idGraduacao, grau, data }
  });
  expect(resposta.status()).toBe(201);
  return (await resposta.json()) as Registro;
}

async function criarContasNomeadas(request: APIRequestContext, prefixo: string, quantidade: number): Promise<Conta[]> {
  const contas = await Promise.all(Array.from({ length: quantidade }, () => criarContaAtiva(request)));
  return contas.map((conta, i) => nomear(conta, `${prefixo}${String.fromCharCode(97 + i)}`));
}

test.describe('Área do dono', () => {
  test('o dono vê o card na Início e chega em Professores e em Graduação', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrarNoInicio(page, dono);

    const card = page.locator('app-area-dono');
    await expect(card.getByRole('heading', { name: 'Área do dono' })).toBeVisible();
    await card.getByRole('button', { name: 'Professores', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/professores$/);

    await page.goto('/app/inicio');
    await card.getByRole('button', { name: 'Graduações', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/graduacao$/);
  });

  test('aluno e professor não veem o card Área do dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const professor = await criarContaAtiva(request);
    await promoverPorApi(request, dono, professor);

    for (const conta of [aluno, professor]) {
      await sairDaSessao(page);
      await entrarNoInicio(page, conta);
      await expect(page.locator('app-card-graduacao')).toBeVisible();
      await expect(page.locator('app-area-dono')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Área do dono' })).toHaveCount(0);
    }
  });

  test.describe('Professores', () => {
    test('a busca ignora acento e maiúsculas e mostra só nome, e-mail e cargo', async ({ page, request }) => {
      const dono = await criarDono(request);
      const unico = `Zq${sufixoUnico()}`;
      const joao = nomear(await criarContaAtiva(request), `João ${unico}`);
      const outro = nomear(await criarContaAtiva(request), `Maria ${unico}`);

      await entrarNoInicio(page, dono);
      await page.goto('/app/professores');
      await page.locator('#busca-pessoa').fill(`JOAO ${unico.toUpperCase()}`);

      const linha = page.locator(`li.pessoa[data-email="${joao.email}"]`);
      await expect(linha).toBeVisible();
      await expect(linha).toContainText(joao.email);
      await expect(linha.locator('.ajj-chip')).toHaveText('Aluno');
      await expect(page.locator(`li.pessoa[data-email="${outro.email}"]`)).toHaveCount(0);
      await expect(page.locator('li.pessoa')).toHaveCount(1);
    });

    test('o filtro de cargo separa professores e alunos', async ({ page, request }) => {
      const dono = await criarDono(request);
      const prefixo = `Filtro${sufixoUnico()}`;
      const [professor, aluno] = await criarContasNomeadas(request, prefixo, 2);
      await promoverPorApi(request, dono, professor);

      await entrarNoInicio(page, dono);
      await page.goto('/app/professores');
      await page.locator('#busca-pessoa').fill(prefixo);
      const linhaProfessor = page.locator(`li.pessoa[data-email="${professor.email}"]`);
      const linhaAluno = page.locator(`li.pessoa[data-email="${aluno.email}"]`);
      await expect(linhaProfessor).toBeVisible();
      await expect(linhaAluno).toBeVisible();

      const chips = page.getByRole('group', { name: 'Filtrar por cargo' });
      await chips.getByRole('button', { name: 'Professores', exact: true }).click();
      await expect(chips.getByRole('button', { name: 'Professores', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(linhaProfessor).toBeVisible();
      await expect(linhaAluno).toHaveCount(0);

      await chips.getByRole('button', { name: 'Alunos', exact: true }).click();
      await expect(linhaAluno).toBeVisible();
      await expect(linhaProfessor).toHaveCount(0);

      await chips.getByRole('button', { name: 'Todos', exact: true }).click();
      await expect(page.locator('li.pessoa')).toHaveCount(2);
    });

    test('a lista pagina de 7 em 7 com Anterior e Próxima', async ({ page, request }) => {
      const dono = await criarDono(request);
      const prefixo = `Pag${sufixoUnico()}`;
      await criarContasNomeadas(request, prefixo, 8);

      await entrarNoInicio(page, dono);
      await page.goto('/app/professores');
      await page.locator('#busca-pessoa').fill(prefixo);

      await expect(page.getByText('8 pessoas')).toBeVisible();
      await expect(page.locator('li.pessoa')).toHaveCount(7);
      await expect(page.getByText('Página 1 de 2')).toBeVisible();
      await expect(botao(page, 'Anterior')).toBeDisabled();

      await botao(page, 'Próxima').click();
      await expect(page.getByText('Página 2 de 2')).toBeVisible();
      await expect(page.locator('li.pessoa')).toHaveCount(1);
      await expect(botao(page, 'Próxima')).toBeDisabled();

      await botao(page, 'Anterior').click();
      await expect(page.locator('li.pessoa')).toHaveCount(7);
    });

    test('o dono promove pelo painel e cancelar não muda nada', async ({ page, request }) => {
      const dono = await criarDono(request);
      const aluno = nomear(await criarContaAtiva(request), `Painel${sufixoUnico()}`);

      await entrarNoInicio(page, dono);
      await page.goto('/app/professores');
      await page.locator('#busca-pessoa').fill(aluno.nome);
      const linha = page.locator(`li.pessoa[data-email="${aluno.email}"]`);

      await linha.locator('button.linha').click();
      await expect(botao(page, 'Tornar professor')).toBeVisible();
      await botao(page, 'Cancelar').click();
      await expect(botao(page, 'Tornar professor')).toHaveCount(0);
      await expect(linha.locator('.ajj-chip')).toHaveText('Aluno');

      await linha.locator('button.linha').click();
      await botao(page, 'Tornar professor').click();
      await responderAlerta(page, 'Tornar professor');
      await esperarToast(page, 'agora é professor');
      await expect(linha.locator('.ajj-chip')).toHaveText('Professor');
    });
  });

  test.describe('Graduação', () => {
    test('a busca ignora acento e a lista pagina de 7 em 7', async ({ page, request }) => {
      const dono = await criarDono(request);
      const unico = `Zg${sufixoUnico()}`;
      const acentuado = nomear(await criarContaAtiva(request), `Ângela ${unico}`);
      const prefixo = `Grad${sufixoUnico()}`;
      await criarContasNomeadas(request, prefixo, 8);

      await entrarNoInicio(page, dono);
      await page.goto('/app/graduacao');
      await page.locator('#busca-aluno').fill(`ANGELA ${unico.toUpperCase()}`);
      await expect(page.locator(`li.aluno[data-email="${acentuado.email}"]`)).toBeVisible();
      await expect(page.locator('li.aluno')).toHaveCount(1);

      await page.locator('#busca-aluno').fill(prefixo);
      await expect(page.getByText('8 alunos')).toBeVisible();
      await expect(page.locator('li.aluno')).toHaveCount(7);
      await expect(page.getByText('Página 1 de 2')).toBeVisible();
      await botao(page, 'Próxima').click();
      await expect(page.getByText('Página 2 de 2')).toBeVisible();
      await expect(page.locator('li.aluno')).toHaveCount(1);
      await botao(page, 'Anterior').click();
      await expect(page.locator('li.aluno')).toHaveCount(7);
    });

    test('o dono remove um registro antigo e depois o atual, e a faixa do aluno acompanha', async ({ page, request }) => {
      const dono = await criarDono(request);
      const aluno = nomear(await criarContaAtiva(request), `Remove${sufixoUnico()}`);
      const branca = await faixaPorCodigo(request, dono, 'FB');
      const azul = await faixaPorCodigo(request, dono, 'FA');
      await registrarPorApi(request, dono, aluno, branca.id, 1, diaRelativo(-30));
      await registrarPorApi(request, dono, aluno, azul.id, 1, diaRelativo(-10));
      await registrarPorApi(request, dono, aluno, azul.id, 2, diaRelativo(-2));
      const painel = page.locator('app-registro-graduacao');

      await entrarNoInicio(page, dono);
      await page.goto('/app/graduacao');
      await page.locator('#busca-aluno').fill(aluno.nome);
      await page.locator(`li.aluno[data-email="${aluno.email}"]`).getByRole('button').click();
      await expect(painel.locator('ul.historico li')).toHaveCount(3);
      await expect(painel.locator('.atual')).toContainText('Faixa Azul · 2 graus');

      await painel.getByRole('button', { name: /^Remover registro Faixa Branca · 1 grau de \d{2}\/\d{4}$/ }).click();
      await expect(page.locator('ion-alert .alert-message')).toContainText('A faixa atual não muda.');
      await responderAlerta(page, 'Remover');
      await esperarToast(page, 'Registro removido.');
      await expect(painel.locator('ul.historico li')).toHaveCount(2);
      await expect(painel.locator('.atual')).toContainText('Faixa Azul · 2 graus');

      await painel.getByRole('button', { name: /^Remover registro Faixa Azul · 2 graus de \d{2}\/\d{4}$/ }).click();
      await expect(page.locator('ion-alert .alert-message')).toContainText(
        `Esta é a faixa atual de ${aluno.nome}: ela volta para Faixa Azul · 1 grau.`
      );
      await responderAlerta(page, 'Remover');
      await esperarToast(page, 'Registro removido.');
      await expect(painel.locator('ul.historico li')).toHaveCount(1);
      await expect(painel.locator('.atual')).toContainText('Faixa Azul · 1 grau');

      await sairDaSessao(page);
      await entrarNoInicio(page, aluno);
      const card = page.locator('app-card-graduacao');
      await expect(card.getByRole('heading', { name: 'Faixa Azul · 1 grau' })).toBeVisible();
      await expect(card.locator('.evolucao li')).toHaveCount(1);

      await sairDaSessao(page);
      await entrarNoInicio(page, dono);
      await page.goto('/app/graduacao');
      await page.locator('#busca-aluno').fill(aluno.nome);
      await page.locator(`li.aluno[data-email="${aluno.email}"]`).getByRole('button').click();
      await painel.getByRole('button', { name: /^Remover registro Faixa Azul · 1 grau de \d{2}\/\d{4}$/ }).click();
      await expect(page.locator('ion-alert .alert-message')).toContainText(`Esta é a faixa atual de ${aluno.nome}: ela fica Sem graduação.`);
      await responderAlerta(page, 'Remover');
      await esperarToast(page, 'Registro removido.');
      await expect(painel.locator('.atual')).toContainText('Sem graduação');
      await expect(painel.getByText('Nenhuma graduação registrada.')).toBeVisible();
    });
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('API: professor e aluno não removem registro, e registro de outro aluno é 404 ERR015', async ({ request }) => {
      const dono = await criarDono(request);
      const professor = await criarContaAtiva(request);
      const aluno = await criarContaAtiva(request);
      const outro = await criarContaAtiva(request);
      await promoverPorApi(request, dono, professor);
      const azul = await faixaPorCodigo(request, dono, 'FA');
      const registro = await registrarPorApi(request, dono, aluno, azul.id, 1, diaRelativo(-1));
      const idAluno = await idDe(request, aluno);
      const idOutro = await idDe(request, outro);

      for (const autor of [professor, aluno]) {
        const resposta = await request.delete(`${URL_API}/alunos/${idAluno}/graduacoes/${registro.id}`, {
          headers: await autorizacao(request, autor)
        });
        expect(resposta.status()).toBe(403);
      }

      const alheio = await request.delete(`${URL_API}/alunos/${idOutro}/graduacoes/${registro.id}`, {
        headers: await autorizacao(request, dono)
      });
      expect(alheio.status()).toBe(404);
      expect(((await alheio.json()) as { codigo: string }).codigo).toBe('ERR015');

      const removido = await request.delete(`${URL_API}/alunos/${idAluno}/graduacoes/${registro.id}`, {
        headers: await autorizacao(request, dono)
      });
      expect(removido.status()).toBe(200);
      expect(((await removido.json()) as { atual: unknown }).atual).toBeNull();

      const repetido = await request.delete(`${URL_API}/alunos/${idAluno}/graduacoes/${registro.id}`, {
        headers: await autorizacao(request, dono)
      });
      expect(repetido.status()).toBe(404);
      expect(((await repetido.json()) as { codigo: string }).codigo).toBe('ERR015');
    });

    test('API: a lista de alunos da graduação vem inteira, sem paginação', async ({ request }) => {
      const dono = await criarDono(request);
      await criarContasNomeadas(request, `Lista${sufixoUnico()}`, 8);

      const resposta = await request.get(`${URL_API}/graduacoes/alunos`, { headers: await autorizacao(request, dono) });

      expect(resposta.status()).toBe(200);
      expect(Array.isArray(await resposta.json())).toBe(true);
      expect(((await resposta.json()) as unknown[]).length).toBeGreaterThanOrEqual(8);
    });
  });
});
