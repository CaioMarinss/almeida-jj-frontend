import { defineConfig, devices } from '@playwright/test';

export const URL_FRONT = 'http://localhost:4300';
export const URL_API = 'http://localhost:18080';
export const URL_MAILPIT = 'http://localhost:18025';

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/resultados',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e/relatorio', open: 'never' }]],
  globalSetup: './e2e/suporte/subir-ambiente.ts',
  globalTeardown: './e2e/suporte/derrubar-ambiente.ts',
  use: {
    baseURL: URL_FRONT,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'npx ng serve --configuration e2e --port 4300',
    url: URL_FRONT,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000
  }
});
