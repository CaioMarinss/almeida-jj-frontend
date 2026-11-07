import { APIRequestContext, expect } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { cpfValido, emailUnico, SENHA_FORTE } from './dados';
import { executarSql } from './banco';
import { linkDoEmail } from './mailpit';

export interface Conta {
  nome: string;
  email: string;
  senha: string;
}

export async function criarContaAtiva(request: APIRequestContext, senha = SENHA_FORTE): Promise<Conta> {
  const conta = { nome: 'Aluno E2E', email: emailUnico(), senha };
  const cadastro = await request.post(`${URL_API}/auth/cadastro`, {
    data: { ...conta, cpf: cpfValido() }
  });
  expect(cadastro.status(), await cadastro.text()).toBe(201);

  const link = await linkDoEmail(request, conta.email, 'Verificação de e-mail');
  const verificacao = await request.post(`${URL_API}/auth/verificacao`, {
    data: { token: link.searchParams.get('token') }
  });
  expect(verificacao.status()).toBe(204);
  return conta;
}

export async function criarDono(request: APIRequestContext): Promise<Conta> {
  const conta = await criarContaAtiva(request);
  executarSql(`UPDATE ALMEIDAJJ.ALUNOS SET CARGO = 'D' WHERE EMAIL = '${conta.email}'`);
  return conta;
}

export async function tokenDe(request: APIRequestContext, conta: Conta): Promise<string> {
  const resposta = await request.post(`${URL_API}/auth/login`, { data: { email: conta.email, senha: conta.senha } });
  expect(resposta.status()).toBe(200);
  return ((await resposta.json()) as { token: string }).token;
}

export async function idDe(request: APIRequestContext, conta: Conta): Promise<number> {
  const resposta = await request.get(`${URL_API}/alunos/me`, {
    headers: { Authorization: `Bearer ${await tokenDe(request, conta)}` }
  });
  return ((await resposta.json()) as { id: number }).id;
}

export function sufixoUnico(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

export function nomear(conta: Conta, nome: string): Conta {
  executarSql(`UPDATE ALMEIDAJJ.ALUNOS SET NOME = '${nome}' WHERE EMAIL = '${conta.email}'`);
  return { ...conta, nome };
}
