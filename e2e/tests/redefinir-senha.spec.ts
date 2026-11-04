import { expect, test } from '@playwright/test';
import { URL_API } from '../../playwright.config';
import { criarContaAtiva } from '../suporte/contas';
import { OUTRA_SENHA_FORTE } from '../suporte/dados';
import { linkDoEmail } from '../suporte/mailpit';
import { botao, contarChamadas, entrar, esperarAlerta, esperarToast, preencher, regrasCumpridas } from '../suporte/telas';

test.describe('Redefinição de senha pelo e-mail', () => {
  test('exige senha forte, troca a senha e invalida o link usado', async ({ page, request }) => {
    const conta = await criarContaAtiva(request);

    await page.goto('/esquecisenha');
    await preencher(page, { email: conta.email });
    await botao(page, 'Enviar link').click();
    await esperarToast(page, 'Se o e-mail estiver cadastrado');

    const link = await linkDoEmail(request, conta.email, 'Redefinição de senha');
    const caminho = `${link.pathname}${link.search}`;
    await page.goto(caminho);
    await expect(page.getByText('Escolha uma senha forte para a sua conta.')).toBeVisible();

    const redefinicoes = contarChamadas(page, 'POST', '/auth/senha/redefinir');
    await preencher(page, { novaSenha: 'fraca123', confirmarSenha: 'fraca123' });
    await botao(page, 'Salvar senha').click();
    await expect(page.getByText('A senha não atende a todos os requisitos.')).toBeVisible();
    expect(redefinicoes()).toBe(0);

    await preencher(page, { novaSenha: OUTRA_SENHA_FORTE, confirmarSenha: OUTRA_SENHA_FORTE });
    await expect(regrasCumpridas(page)).toHaveCount(6);
    await botao(page, 'Salvar senha').click();
    await esperarToast(page, 'Senha redefinida com sucesso!');
    await expect(page).toHaveURL(/\/login$/);

    await entrar(page, conta.email, OUTRA_SENHA_FORTE);
    await expect(page).toHaveURL(/\/app\/inicio$/);

    await page.context().clearCookies();
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(caminho);
    await preencher(page, { novaSenha: 'Mais1Senha!', confirmarSenha: 'Mais1Senha!' });
    await botao(page, 'Salvar senha').click();
    await esperarAlerta(page, 'Link inválido ou expirado.');
  });

  test('a senha antiga para de funcionar', async ({ page, request }) => {
    const conta = await criarContaAtiva(request);
    await request.post(`${URL_API}/auth/senha/esqueci`, { data: { email: conta.email } });
    const link = await linkDoEmail(request, conta.email, 'Redefinição de senha');
    const resposta = await request.post(`${URL_API}/auth/senha/redefinir`, {
      data: { token: link.searchParams.get('token'), novaSenha: OUTRA_SENHA_FORTE }
    });
    expect(resposta.status()).toBe(204);

    await entrar(page, conta.email, conta.senha);

    await expect(page.locator('ion-alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
