import { APIRequestContext, expect } from '@playwright/test';
import { URL_MAILPIT } from '../../playwright.config';

interface ResumoMensagem {
  ID: string;
  Subject: string;
}

export async function linkDoEmail(request: APIRequestContext, para: string, assunto: string): Promise<URL> {
  let id = '';
  await expect
    .poll(
      async () => {
        const resposta = await request.get(`${URL_MAILPIT}/api/v1/search`, { params: { query: `to:"${para}"` } });
        const { messages } = (await resposta.json()) as { messages: ResumoMensagem[] };
        id = messages.find(m => m.Subject === assunto)?.ID ?? '';
        return id;
      },
      { message: `e-mail "${assunto}" para ${para}`, timeout: 20_000 }
    )
    .not.toBe('');

  const mensagem = await request.get(`${URL_MAILPIT}/api/v1/message/${id}`);
  const { Text } = (await mensagem.json()) as { Text: string };
  const link = Text.match(/https?:\/\/\S+/)?.[0];
  expect(link, 'link no corpo do e-mail').toBeTruthy();
  return new URL(link!);
}

export async function quantidadeDeEmails(request: APIRequestContext, para: string): Promise<number> {
  const resposta = await request.get(`${URL_MAILPIT}/api/v1/search`, { params: { query: `to:"${para}"` } });
  return ((await resposta.json()) as { messages: ResumoMensagem[] }).messages.length;
}
