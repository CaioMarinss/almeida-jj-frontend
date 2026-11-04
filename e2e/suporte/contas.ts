import { APIRequestContext, expect } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { cpfValido, emailUnico, SENHA_FORTE } from './dados';
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
