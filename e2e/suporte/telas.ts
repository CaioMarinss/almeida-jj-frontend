import { expect, Page } from '@playwright/test';

export function campo(page: Page, id: string) {
  return page.locator(`ion-input#${id} input:not(.cloned-input)`);
}

export async function preencher(page: Page, valores: Record<string, string>): Promise<void> {
  for (const [id, valor] of Object.entries(valores)) {
    await campo(page, id).fill(valor);
  }
}

export function botao(page: Page, nome: string) {
  return page.locator('ajj-botao').getByRole('button', { name: nome, exact: true });
}

export function regrasCumpridas(page: Page) {
  return page.locator('ajj-regras-senha li.cumprida');
}

export function regra(page: Page, id: string) {
  return page.locator(`ajj-regras-senha li[data-regra="${id}"]`);
}

export async function entrar(page: Page, email: string, senha: string): Promise<void> {
  await page.goto('/login');
  await preencher(page, { email, senha });
  await botao(page, 'Entrar').click();
}

export async function esperarToast(page: Page, texto: string): Promise<void> {
  await expect(page.locator('ion-toast .toast-message').filter({ hasText: texto })).toBeVisible();
}

export async function esperarAlerta(page: Page, texto: string): Promise<void> {
  await expect(page.locator('ion-alert .alert-message')).toContainText(texto);
}

export async function responderAlerta(page: Page, botaoAlerta: string): Promise<void> {
  await page.locator('ion-alert').getByRole('button', { name: botaoAlerta }).click();
}

export function contarChamadas(page: Page, metodo: string, caminho: string): () => number {
  let total = 0;
  page.on('request', req => {
    if (req.method() === metodo && new URL(req.url()).pathname === caminho) {
      total++;
    }
  });
  return () => total;
}
