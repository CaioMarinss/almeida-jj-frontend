import { expect, test } from '@playwright/test';
import { linkDoEmail } from '../suporte/mailpit';
import { cpfValido, emailUnico, SENHA_FORTE } from '../suporte/dados';
import { botao, campo, contarChamadas, entrar, esperarToast, preencher, regra, regrasCumpridas } from '../suporte/telas';

test.describe('Cadastro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cadastro');
    await preencher(page, { nome: 'Aluno E2E', cpf: cpfValido(), email: emailUnico() });
  });

  test('a lista de regras acompanha a digitação', async ({ page }) => {
    await expect(page.locator('ajj-regras-senha li')).toHaveCount(6);
    await expect(regrasCumpridas(page)).toHaveCount(0);

    await campo(page, 'senha').fill('abc');
    await expect(regra(page, 'minuscula')).toHaveClass(/cumprida/);
    await expect(regra(page, 'maiuscula')).not.toHaveClass(/cumprida/);

    await campo(page, 'senha').fill('Abc1');
    await expect(regrasCumpridas(page)).toHaveCount(4);

    await campo(page, 'senha').fill('Abc1 !xyz');
    await expect(regra(page, 'semEspaco')).not.toHaveClass(/cumprida/);

    await campo(page, 'senha').fill(SENHA_FORTE);
    await expect(regrasCumpridas(page)).toHaveCount(6);
  });

  for (const fraca of ['Curta@1', 'semmaiuscula@1', 'SEMMINUSCULA@1', 'SemNumero@', 'SemEspecial1', 'Com Espaco@1']) {
    test(`não envia a senha fraca "${fraca}"`, async ({ page }) => {
      const cadastros = contarChamadas(page, 'POST', '/auth/cadastro');
      await preencher(page, { senha: fraca, passwordConfirm: fraca });

      await botao(page, 'Criar conta').click();

      await expect(page.getByText('A senha não atende a todos os requisitos.')).toBeVisible();
      await expect(page).toHaveURL(/\/cadastro$/);
      expect(cadastros()).toBe(0);
    });
  }

  test('não envia quando a confirmação é diferente', async ({ page }) => {
    const cadastros = contarChamadas(page, 'POST', '/auth/cadastro');
    await preencher(page, { senha: SENHA_FORTE, passwordConfirm: `${SENHA_FORTE}x` });

    await botao(page, 'Criar conta').click();

    await expect(page.getByText('As senhas não coincidem.')).toBeVisible();
    expect(cadastros()).toBe(0);
  });

  test('com senha forte cria a conta, verifica pelo e-mail e entra', async ({ page, request }) => {
    const email = await campo(page, 'email').inputValue();
    await preencher(page, { senha: SENHA_FORTE, passwordConfirm: SENHA_FORTE });

    await botao(page, 'Criar conta').click();

    await esperarToast(page, 'Cadastro realizado!');
    await expect(page).toHaveURL(/\/login$/);

    const link = await linkDoEmail(request, email, 'Verificação de e-mail');
    await page.goto(`${link.pathname}${link.search}`);
    await expect(page.getByText('E-mail verificado com sucesso!')).toBeVisible();

    await entrar(page, email, SENHA_FORTE);
    await expect(page).toHaveURL(/\/app\/inicio$/);
  });
});
