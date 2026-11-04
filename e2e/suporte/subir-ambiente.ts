import { URL_API, URL_MAILPIT } from '../../playwright.config';
import { compose, esperarResposta } from './ambiente';

export default async function subirAmbiente(): Promise<void> {
  if (process.env['E2E_SEM_DOCKER']) {
    return;
  }
  compose('up --build --detach --wait db mailpit');
  compose('up --build --detach api');
  await esperarResposta(URL_MAILPIT, 60_000);
  await esperarResposta(`${URL_API}/auth/login`, 300_000);
}
