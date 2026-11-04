import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const COMPOSE = resolve(__dirname, '..', 'docker-compose.yml');

export function compose(argumentos: string): void {
  execSync(`docker compose -f "${COMPOSE}" ${argumentos}`, { stdio: 'inherit' });
}

export async function esperarResposta(url: string, timeoutMs: number): Promise<void> {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`${url} não respondeu em ${timeoutMs / 1000}s`);
}
