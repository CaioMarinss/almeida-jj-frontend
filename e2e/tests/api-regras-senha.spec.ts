import { expect, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { criarContaAtiva } from '../suporte/contas';
import { cpfValido, emailUnico, OUTRA_SENHA_FORTE } from '../suporte/dados';

test.describe('API recusa senha fraca mesmo sem passar pelo front', () => {
  test.skip(({ isMobile }) => isMobile, 'não depende da tela');

  const casos: [string, string][] = [
    ['Curta@1', 'A senha precisa ter pelo menos 8 caracteres.'],
    ['semmaiuscula@1', 'A senha precisa ter uma letra maiúscula.'],
    ['SEMMINUSCULA@1', 'A senha precisa ter uma letra minúscula.'],
    ['SemNumero@', 'A senha precisa ter um número.'],
    ['SemEspecial1', 'A senha precisa ter um caractere especial.'],
    ['Com Espaco@1', 'A senha não pode ter espaços.'],
    ['abc', 'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial.']
  ];

  type ErroValidacao = { erros: { campo: string; mensagem: string }[] };
  const mensagensDo = (corpo: ErroValidacao, campo: string) =>
    corpo.erros.filter(e => e.campo === campo).map(e => e.mensagem);

  for (const [senha, mensagem] of casos) {
    test(`cadastro com "${senha}" devolve 400 explicando o motivo`, async ({ request }) => {
      const resposta = await request.post(`${URL_API}/auth/cadastro`, {
        data: { nome: 'Aluno E2E', cpf: cpfValido(), email: emailUnico(), senha }
      });

      expect(resposta.status()).toBe(400);
      expect(mensagensDo(await resposta.json(), 'senha')).toContain(mensagem);
    });
  }

  test('redefinição com senha fraca devolve 400 antes de olhar o token', async ({ request }) => {
    const resposta = await request.post(`${URL_API}/auth/senha/redefinir`, {
      data: { token: 'qualquer', novaSenha: 'fraca' }
    });

    expect(resposta.status()).toBe(400);
    expect(mensagensDo(await resposta.json(), 'novaSenha').length).toBeGreaterThan(0);
  });

  test('troca de senha logado: recusa fraca e aceita forte', async ({ request }) => {
    const conta = await criarContaAtiva(request);
    const login = await request.post(`${URL_API}/auth/login`, { data: { email: conta.email, senha: conta.senha } });
    const { token } = (await login.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };

    const fraca = await request.put(`${URL_API}/alunos/me/senha`, {
      headers,
      data: { senhaAtual: conta.senha, novaSenha: 'SENHA1234' }
    });
    expect(fraca.status()).toBe(400);
    expect(mensagensDo(await fraca.json(), 'novaSenha')).toContain(
      'A senha precisa ter uma letra minúscula e um caractere especial.'
    );

    const forte = await request.put(`${URL_API}/alunos/me/senha`, {
      headers,
      data: { senhaAtual: conta.senha, novaSenha: OUTRA_SENHA_FORTE }
    });
    expect(forte.status()).toBe(204);
  });

  test('login continua aceitando contas com senha antiga fora das regras', async ({ request }) => {
    const resposta = await request.post(`${URL_API}/auth/login`, {
      data: { email: 'aluno1@example.com', senha: 'qualquer' }
    });
    expect(resposta.status()).not.toBe(400);
  });
});
