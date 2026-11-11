import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { Conta, criarContaAtiva, criarDono, idDe, nomear, sufixoUnico, tokenDe } from '../suporte/contas';
import { dataDaSemana, hojeEmSaoPaulo, somarDias } from '../suporte/datas';
import { descartarPresencasDoAluno, inserirPresencaNaGrade, promoverProfessor } from '../suporte/presenca';
import { botao, entrar, entrarComoDono, esperarToast, responderAlerta } from '../suporte/telas';

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

async function entrarNaTelaDoDono(page: Page, dono: Conta): Promise<void> {
  await sairDaSessao(page);
  await entrarComoDono(page, dono.email, dono.senha);
}

function diaRelativo(dias: number): string {
  return somarDias(hojeEmSaoPaulo(), dias);
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

async function buscar(page: Page, texto: string): Promise<void> {
  await page.locator('#busca-aluno').fill(texto);
}

async function abrirFichaPelaLista(page: Page, aluno: Conta): Promise<void> {
  await page.goto('/app/alunos');
  await buscar(page, aluno.nome);
  await page.locator(`li.aluno[data-email="${aluno.email}"] a.linha`).click();
  await expect(page).toHaveURL(/\/app\/alunos\/\d+$/);
  await expect(page.locator('app-ficha-aluno header.cabeca')).toContainText(aluno.nome);
}

function aba(page: Page, nome: string) {
  return page.locator('app-ficha-aluno ion-segment-button').filter({ hasText: nome });
}

test.describe('Alunos', () => {
  test('a busca ignora acento e a lista pagina de 7 em 7', async ({ page, request }) => {
    const dono = await criarDono(request);
    const unico = `Zg${sufixoUnico()}`;
    const acentuado = nomear(await criarContaAtiva(request), `Ângela ${unico}`);
    const prefixo = `Lista${sufixoUnico()}`;
    await criarContasNomeadas(request, prefixo, 8);

    await entrarNaTelaDoDono(page, dono);
    await page.goto('/app/alunos');
    await buscar(page, `ANGELA ${unico.toUpperCase()}`);
    await expect(page.locator(`li.aluno[data-email="${acentuado.email}"]`)).toBeVisible();
    await expect(page.locator('li.aluno')).toHaveCount(1);

    await buscar(page, prefixo);
    await expect(page.getByText('8 alunos')).toBeVisible();
    await expect(page.locator('li.aluno')).toHaveCount(7);
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    await expect(botao(page, 'Anterior')).toBeDisabled();
    await botao(page, 'Próxima').click();
    await expect(page.getByText('Página 2 de 2')).toBeVisible();
    await expect(page.locator('li.aluno')).toHaveCount(1);
    await expect(botao(page, 'Próxima')).toBeDisabled();
    await botao(page, 'Anterior').click();
    await expect(page.locator('li.aluno')).toHaveCount(7);
  });

  test('o filtro Sumidos mostra quem não treina há 14 dias ou mais e a ficha abre na aba Exames', async ({ page, request }) => {
    const dono = await criarDono(request);
    const sumido = nomear(await criarContaAtiva(request), `Sumido${sufixoUnico()}`);
    const presente = nomear(await criarContaAtiva(request), `Presente${sufixoUnico()}`);
    const idSumido = await idDe(request, sumido);
    const idPresente = await idDe(request, presente);
    const antiga = dataDaSemana(-3, 1);
    inserirPresencaNaGrade(idSumido, 1, '18:00', antiga);
    inserirPresencaNaGrade(idPresente, 1, '18:00', antiga);
    inserirPresencaNaGrade(idPresente, 1, '18:00', dataDaSemana(-1, 1));
    const dias = Math.round((Date.parse(hojeEmSaoPaulo()) - Date.parse(antiga)) / 86_400_000);

    try {
      await entrarNaTelaDoDono(page, dono);
      await page.goto('/app/alunos');
      await buscar(page, 'Sumido');
      const filtros = page.getByRole('group', { name: 'Filtrar alunos' });
      await expect(filtros.getByRole('button', { name: /^Sumidos · \d+$/ })).toBeVisible();
      await filtros.getByRole('button', { name: /^Sumidos · \d+$/ }).click();

      const linha = page.locator(`li.aluno[data-email="${sumido.email}"]`);
      await expect(linha).toContainText(`sumido · ${dias} dias`);
      await buscar(page, '');
      await expect(page.locator(`li.aluno[data-email="${presente.email}"]`)).toHaveCount(0);

      await buscar(page, sumido.nome);
      await linha.locator('a.linha').click();
      await expect(page).toHaveURL(/\/app\/alunos\/\d+$/);
      const ficha = page.locator('app-ficha-aluno');
      await expect(ficha.locator('header.cabeca')).toContainText(sumido.nome);
      await expect(ficha.locator('.numeros')).toContainText('Presenças no ciclo');
      await expect(ficha.locator('.numeros')).toContainText('Último treino');
      await expect(ficha.locator('.numeros')).toContainText('Último exame');
      await expect(ficha.locator('app-presencas-aluno')).toBeVisible();

      await aba(page, 'Exames').click();
      await expect(ficha.locator('app-exames-aluno')).toContainText('Nenhum exame registrado.');
    } finally {
      descartarPresencasDoAluno(idSumido);
      descartarPresencasDoAluno(idPresente);
    }
  });

  test('o dono remove um registro antigo e depois o atual na ficha, e a faixa do aluno acompanha', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = nomear(await criarContaAtiva(request), `Remove${sufixoUnico()}`);
    const branca = await faixaPorCodigo(request, dono, 'FB');
    const azul = await faixaPorCodigo(request, dono, 'FA');
    await registrarPorApi(request, dono, aluno, branca.id, 1, diaRelativo(-30));
    await registrarPorApi(request, dono, aluno, azul.id, 1, diaRelativo(-10));
    await registrarPorApi(request, dono, aluno, azul.id, 2, diaRelativo(-2));
    const painel = page.locator('app-registro-graduacao');

    await entrarNaTelaDoDono(page, dono);
    await abrirFichaPelaLista(page, aluno);
    await aba(page, 'Graduações').click();
    await expect(painel.locator('ul.historico li')).toHaveCount(3);

    await painel.getByRole('button', { name: /^Remover registro Faixa Branca · 1 grau de \d{2}\/\d{4}$/ }).click();
    await expect(page.locator('ion-alert .alert-message')).toContainText('A faixa atual não muda.');
    await responderAlerta(page, 'Remover');
    await esperarToast(page, 'Registro removido.');
    await expect(painel.locator('ul.historico li')).toHaveCount(2);

    await painel.getByRole('button', { name: /^Remover registro Faixa Azul · 2 graus de \d{2}\/\d{4}$/ }).click();
    await expect(page.locator('ion-alert .alert-message')).toContainText(
      `Esta é a faixa atual de ${aluno.nome}: ela volta para Faixa Azul · 1 grau.`
    );
    await responderAlerta(page, 'Remover');
    await esperarToast(page, 'Registro removido.');
    await expect(painel.locator('ul.historico li')).toHaveCount(1);

    await sairDaSessao(page);
    await entrar(page, aluno.email, aluno.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    const card = page.locator('app-card-graduacao');
    await expect(card.getByRole('heading', { name: 'Faixa Azul · 1 grau' })).toBeVisible();
    await expect(card.locator('.evolucao li')).toHaveCount(1);
  });

  test('links antigos redirecionam para as telas novas', async ({ page, request }) => {
    const dono = await criarDono(request);
    await entrarNaTelaDoDono(page, dono);

    for (const [antigo, novo] of [
      ['/app/inicio', /\/app\/chamada$/],
      ['/app/aulas', /\/app\/chamada$/],
      ['/app/presenca', /\/app\/chamada$/],
      ['/app/professores', /\/app\/alunos$/],
      ['/app/sumidos', /\/app\/alunos$/],
      ['/app/agenda', /\/app\/grade$/]
    ] as const) {
      await page.goto(antigo);
      await expect(page).toHaveURL(novo);
    }
  });

  test('aluno e professor são mandados para a Início nas telas do dono', async ({ page, request }) => {
    const dono = await criarDono(request);
    const aluno = await criarContaAtiva(request);
    const professor = await criarContaAtiva(request);
    await promoverProfessor(request, dono, professor);

    for (const conta of [aluno, professor]) {
      await sairDaSessao(page);
      await entrar(page, conta.email, conta.senha);
      await expect(page).toHaveURL(/\/app\/inicio$/);
      for (const rota of ['/app/chamada', '/app/alunos', '/app/graduacao', '/app/grade']) {
        await page.goto(rota);
        await expect(page).toHaveURL(/\/app\/inicio$/);
      }
    }
  });

  test.describe('só desktop', () => {
    test.skip(({ isMobile }) => isMobile, 'não depende da tela de celular');

    test('API: professor e aluno não removem registro, e registro de outro aluno é 404 ERR015', async ({ request }) => {
      const dono = await criarDono(request);
      const professor = await criarContaAtiva(request);
      const aluno = await criarContaAtiva(request);
      const outro = await criarContaAtiva(request);
      await promoverProfessor(request, dono, professor);
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

    test('API: a lista de alunos da graduação e o painel vêm inteiros, sem paginação', async ({ request }) => {
      const dono = await criarDono(request);
      await criarContasNomeadas(request, `Lista${sufixoUnico()}`, 8);
      const headers = await autorizacao(request, dono);

      for (const caminho of ['/graduacoes/alunos', '/alunos/painel']) {
        const resposta = await request.get(`${URL_API}${caminho}`, { headers });
        expect(resposta.status()).toBe(200);
        expect(((await resposta.json()) as unknown[]).length, caminho).toBeGreaterThanOrEqual(8);
      }
    });

    test('API: o painel de alunos e os exames de um aluno são só do dono', async ({ request }) => {
      const dono = await criarDono(request);
      const professor = await criarContaAtiva(request);
      const aluno = await criarContaAtiva(request);
      await promoverProfessor(request, dono, professor);
      const idAluno = await idDe(request, aluno);

      for (const autor of [professor, aluno]) {
        const headers = await autorizacao(request, autor);
        expect((await request.get(`${URL_API}/alunos/painel`, { headers })).status()).toBe(403);
        expect((await request.get(`${URL_API}/alunos`, { headers })).status()).toBe(403);
        expect((await request.get(`${URL_API}/alunos/${idAluno}/exames`, { headers })).status()).toBe(403);
      }
      const exames = await request.get(`${URL_API}/alunos/${idAluno}/exames`, { headers: await autorizacao(request, dono) });
      expect(exames.status()).toBe(200);
      expect(await exames.json()).toEqual([]);
    });
  });
});
