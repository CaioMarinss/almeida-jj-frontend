import { expect, test } from '@playwright/test';
import { criarContaAtiva } from '../suporte/contas';
import { OUTRA_SENHA_FORTE } from '../suporte/dados';
import {
  botao,
  contarChamadas,
  entrar,
  esperarAlerta,
  esperarToast,
  preencher,
  regrasCumpridas,
  responderAlerta
} from '../suporte/telas';

test.describe('Troca de senha no perfil', () => {
  test('bloqueia senha fraca, mostra o erro da API e troca com senha forte', async ({ page, request }) => {
    const conta = await criarContaAtiva(request);
    await entrar(page, conta.email, conta.senha);
    await expect(page).toHaveURL(/\/app\/inicio$/);
    await page.goto('/app/perfil');

    const trocas = contarChamadas(page, 'PUT', '/alunos/me/senha');
    await preencher(page, { senhaAtual: conta.senha, novaSenha: 'SoLetras!', passwordConfirm: 'SoLetras!' });
    await botao(page, 'Trocar senha').click();
    await expect(page.getByText('A senha não atende a todos os requisitos.')).toBeVisible();
    expect(trocas()).toBe(0);

    await preencher(page, {
      senhaAtual: 'SenhaErrada@1',
      novaSenha: OUTRA_SENHA_FORTE,
      passwordConfirm: OUTRA_SENHA_FORTE
    });
    await expect(regrasCumpridas(page)).toHaveCount(6);
    await botao(page, 'Trocar senha').click();
    await responderAlerta(page, 'Alterar');
    await esperarAlerta(page, 'Senha atual incorreta.');
    await responderAlerta(page, 'OK');
    expect(trocas()).toBe(1);

    await preencher(page, { senhaAtual: conta.senha });
    await botao(page, 'Trocar senha').click();
    await responderAlerta(page, 'Alterar');
    await esperarToast(page, 'Senha alterada!');
    await expect(page).toHaveURL(/\/login$/);

    await entrar(page, conta.email, OUTRA_SENHA_FORTE);
    await expect(page).toHaveURL(/\/app\/inicio$/);
  });
});
