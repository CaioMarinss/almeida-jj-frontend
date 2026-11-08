import { APIRequestContext, expect, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { executarSql } from './banco';
import { Conta, idDe, tokenDe } from './contas';
import { dataDaSemana, hojeEmSaoPaulo } from './datas';

export interface AulaCriada {
  id: number;
  data: string;
  inicio: string;
}

export async function autorizacao(request: APIRequestContext, conta: Conta): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await tokenDe(request, conta)}` };
}

export async function promoverProfessor(request: APIRequestContext, dono: Conta, alvo: Conta): Promise<void> {
  const resposta = await request.put(`${URL_API}/alunos/${await idDe(request, alvo)}/perfil`, {
    headers: await autorizacao(request, dono),
    data: { perfil: 'PROFESSOR' }
  });
  expect(resposta.status()).toBe(204);
}

export function minutosAgora(): number {
  const [hora, minuto] = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour12: false })
    .split(':')
    .map(Number);
  return hora * 60 + minuto;
}

export function hora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

function sorteio(minimo: number, maximo: number): number {
  return minimo + Math.floor(Math.random() * (maximo - minimo + 1));
}

async function criarAvulsa(request: APIRequestContext, dono: Conta, data: string, inicio: number, duracao: number): Promise<AulaCriada | null> {
  const resposta = await request.post(`${URL_API}/agenda/avulsas`, {
    headers: await autorizacao(request, dono),
    data: { data, inicio: hora(inicio), fim: hora(inicio + duracao), modalidade: 'GI', motivo: 'Aula e2e' }
  });
  if (resposta.status() === 422) {
    return null;
  }
  expect(resposta.status(), await resposta.text()).toBe(201);
  return { id: ((await resposta.json()) as { id: number }).id, data, inicio: hora(inicio) };
}

async function tentar(gerar: () => number | null, criar: (inicio: number) => Promise<AulaCriada | null>): Promise<AulaCriada | null> {
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const inicio = gerar();
    if (inicio === null) {
      return null;
    }
    const aula = await criar(inicio);
    if (aula) {
      return aula;
    }
  }
  return null;
}

export async function avulsaAberta(request: APIRequestContext, dono: Conta): Promise<AulaCriada | null> {
  const agora = minutosAgora();
  if (agora + 5 + 40 + 30 > 23 * 60 + 59) {
    return null;
  }
  return tentar(
    () => agora + sorteio(5, 40),
    inicio => criarAvulsa(request, dono, hojeEmSaoPaulo(), inicio, 30)
  );
}

export async function avulsaFechada(request: APIRequestContext, dono: Conta): Promise<AulaCriada | null> {
  if (minutosAgora() < 60) {
    return null;
  }
  return tentar(
    () => sorteio(10, 20),
    inicio => criarAvulsa(request, dono, hojeEmSaoPaulo(), inicio, 10)
  );
}

export async function removerAvulsa(request: APIRequestContext, dono: Conta, aula: AulaCriada): Promise<void> {
  await request.delete(`${URL_API}/agenda/avulsas/${aula.id}`, { headers: await autorizacao(request, dono) });
}

export async function gradeDoDomingoAberta(request: APIRequestContext, dono: Conta): Promise<AulaCriada | null> {
  const data = dataDaSemana(0, 7);
  const agora = minutosAgora();
  const hoje = data === hojeEmSaoPaulo();
  if (hoje && agora + 5 + 40 + 60 > 23 * 60 + 59) {
    return null;
  }
  return tentar(
    () => (hoje ? agora + sorteio(5, 40) : sorteio(20 * 60, 22 * 60)),
    async inicio => {
      const resposta = await request.post(`${URL_API}/aulas/grade`, {
        headers: await autorizacao(request, dono),
        data: { diaSemana: 7, inicio: hora(inicio), fim: hora(inicio + 60), modalidade: 'GI' }
      });
      if (resposta.status() === 422) {
        return null;
      }
      expect(resposta.status(), await resposta.text()).toBe(201);
      return { id: ((await resposta.json()) as { id: number }).id, data, inicio: hora(inicio) };
    }
  );
}

export async function removerGrade(request: APIRequestContext, dono: Conta, aula: AulaCriada): Promise<void> {
  await request.delete(`${URL_API}/aulas/grade/${aula.id}`, { headers: await autorizacao(request, dono) });
}

export async function idDaGrade(request: APIRequestContext, dono: Conta, diaSemana: number, inicio: string): Promise<number> {
  const resposta = await request.get(`${URL_API}/aulas/grade`, { headers: await autorizacao(request, dono) });
  const grade = (await resposta.json()) as { id: number; diaSemana: number; inicio: string }[];
  const aula = grade.find(a => a.diaSemana === diaSemana && a.inicio.startsWith(inicio));
  expect(aula, `${diaSemana} ${inicio}`).toBeDefined();
  return (aula as { id: number }).id;
}

export async function marcarPorApi(request: APIRequestContext, aluno: Conta, aula: AulaCriada): Promise<void> {
  const resposta = await request.post(`${URL_API}/agenda/${aula.data}/aulas/${aula.id}/presenca`, {
    headers: await autorizacao(request, aluno)
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
}

export function inserirPresencaNaAula(idAluno: number, idAula: number, data: string, origem = 'A'): void {
  executarSql(
    `INSERT INTO ALMEIDAJJ.PRESENCAS (ID_ALUNO, ID_AULA, DT_TREINO, ORIGEM, ID_REGISTRADO_POR) VALUES (${idAluno}, ${idAula}, '${data}', '${origem}', ${idAluno})`
  );
}

export function inserirPresencaNaGrade(idAluno: number, diaSemana: number, inicio: string, data: string, origem = 'A'): void {
  executarSql(
    `INSERT INTO ALMEIDAJJ.PRESENCAS (ID_ALUNO, ID_AULA, DT_TREINO, ORIGEM, ID_REGISTRADO_POR) ` +
      `SELECT ${idAluno}, ID_AULA, '${data}', '${origem}', ${idAluno} FROM ALMEIDAJJ.AULAS ` +
      `WHERE DIA_SEMANA = ${diaSemana} AND HR_INICIO = '${inicio}' AND DT_FIM_VIGENCIA IS NULL AND DTHR_INATIVACAO IS NULL LIMIT 1`
  );
}

export async function agendarProximaPorApi(
  request: APIRequestContext,
  dono: Conta,
  data: string,
  minimoGrau: number,
  minimoFaixa: number
): Promise<void> {
  const resposta = await request.put(`${URL_API}/graduacoes/proxima`, {
    headers: await autorizacao(request, dono),
    data: { data, minimoGrau, minimoFaixa }
  });
  expect(resposta.status(), await resposta.text()).toBe(200);
}

export async function cancelarProximaPorApi(request: APIRequestContext, dono: Conta): Promise<void> {
  await request.delete(`${URL_API}/graduacoes/proxima`, { headers: await autorizacao(request, dono) });
}

export function descartarAulaPorSql(aula: AulaCriada): void {
  executarSql(`UPDATE ALMEIDAJJ.PRESENCAS SET DTHR_INATIVACAO = CURRENT_TIMESTAMP WHERE ID_AULA = ${aula.id} AND DTHR_INATIVACAO IS NULL`);
  executarSql(`UPDATE ALMEIDAJJ.AULAS SET DTHR_INATIVACAO = CURRENT_TIMESTAMP WHERE ID_AULA = ${aula.id}`);
}

export function descartarPresencasDoAluno(idAluno: number): void {
  executarSql(`UPDATE ALMEIDAJJ.PRESENCAS SET DTHR_INATIVACAO = CURRENT_TIMESTAMP WHERE ID_ALUNO = ${idAluno} AND DTHR_INATIVACAO IS NULL`);
}

export function horarioDeSaoPaulo(): string {
  return `${hojeEmSaoPaulo()} ${hora(minutosAgora())} (São Paulo)`;
}

export function exigirAula(aula: AulaCriada | null, motivo: string): AulaCriada {
  if (!aula) {
    test.info().annotations.push({ type: 'pulado-por-horario', description: `${motivo}; agora ${horarioDeSaoPaulo()}` });
    test.skip(true, motivo);
  } else {
    test.info().annotations.push({ type: 'horario-sorteado', description: `aula ${aula.id} em ${aula.data} ${aula.inicio}; agora ${horarioDeSaoPaulo()}` });
  }
  return aula as AulaCriada;
}
