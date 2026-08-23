import { mkdir, writeFile } from 'node:fs/promises';

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  throw new Error('Defina API_URL antes de iniciar. Exemplo: export API_URL="http://localhost:8080"');
}

await mkdir('src/environments', { recursive: true });
await writeFile(
  'src/environments/environment.ts',
  `export const environment = { apiUrl: ${JSON.stringify(apiUrl.replace(/\/$/, ''))} };\n`
);
