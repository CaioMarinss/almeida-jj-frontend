# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend for the Almeida JJ dojo attendance system. Backend lives in `../almeidaPresenca` (Spring Boot API — see its `CLAUDE.md`).

## Commands

```bash
# API_URL is REQUIRED — scripts/set-environment.mjs fails without it
export API_URL="http://localhost:8080"

npm start        # writes src/environments/environment.ts, then ng serve (http://localhost:4200)
npm run build    # same env generation, then ng build
npm test         # Karma + Jasmine
npm run e2e      # Playwright end-to-end (Docker: Postgres + Mailpit + API built from ../almeidaPresenca)
```

`src/environments/environment.ts` is **generated** by `scripts/set-environment.mjs` from `API_URL` (trailing slash stripped). It is tracked in git, so avoid committing a non-local URL.

## Stack

Angular 22.2, standalone components, **zoneless** change detection (no zone.js), signals for state, `ChangeDetectionStrategy.OnPush` everywhere, `inject()` for DI, SCSS, `HttpClient` with `withFetch()` + functional interceptors. UI is **Ionic 9** (`@ionic/angular/standalone` components, `provideIonicAngular({ mode: 'md' })`) with **Lucide** icons (`@lucide/angular`). PWA via `@angular/service-worker` (`ngsw-config.json`, enabled only outside dev mode; Ionic `animated` is off when `prefers-reduced-motion: reduce`) and Capacitor 8 configured in `capacitor.config.ts` (`appId br.com.almeidajj.app`, `webDir dist/almeida-jj/browser`; native platforms not added yet). App config in `src/app/app.config.ts`, routes in `src/app/app.routes.ts` (all `loadComponent`, lazy). Licenses: MIT/ISC/Apache only.

## Structure (`src/app`)

- `core/auth/` — `SessionService` (only owner of `sessionStorage`: keys `ajj.token`, `ajj.usuario`; exposes `usuario`/`autenticado` signals; `encerrar()` logs out; `sessaoValida()` also ends the session when the JWT `exp` has passed), `SaidaService` (confirm → `encerrar()` → `NavController.navigateRoot('/login')`; used by shell and perfil), `AuthService` (all `/auth/**` calls), `authGuard` (functional, redirects to `/login`), `visitanteGuard` (on `''`/`login`, sends a logged-in user to `/app/inicio`), `usuario.ts` (`Usuario`, `Perfil`, `ROTULO_PERFIL`)
- `core/http/` — `authInterceptor` (adds `Bearer` only to `environment.apiUrl` URLs), `sessaoExpiradaInterceptor` (401 outside `/auth/**` → logout + `/login` + "Sua sessão expirou" toast), `erro-api.ts` (`mensagemDeErro`/`codigoDeErro` read the API `ProblemDetail`)
- `core/notificacao/` — `Notificador` (abstract class used as DI token: `sucesso`, `aviso`, `erro`, `erroDaApi`, `confirmar`) + `IonicNotificador` (toasts via `ToastController`, errors/confirmations via `AlertController`; a second `confirmar` while one is open resolves `false`). Inject `Notificador`, never the Ionic controllers directly.
- `core/pwa/` — `AtualizacaoAppService` (started by `provideAppInitializer`; on `VERSION_READY` asks to update and reloads, reloads on `unrecoverable`, checks for updates when the tab becomes visible)
- `features/auth/` — `login`, `cadastro`, `esqueci-senha`, `reenviar-verificacao`, `verificar`, `redefinir-senha` (`testes-auth.ts` holds spec helpers)
- `features/shell/` — logged-in shell: `ion-split-pane` (side `ion-menu` at ≥ 992 px) + `ion-tabs` with a bottom tab bar (hidden when the menu is visible)
- `features/inicio`, `aulas`, `presenca`, `financeiro` — logged-in screens, **empty states only** (no fake data); `features/perfil` (+ `PerfilService` for password change; no name editing until the API has `PUT /alunos/me`). `features/testes-app.ts` holds spec helpers.
- `shared/ui/` — `campo` (`ControlValueAccessor` over `ion-input`; `formato="cpf"` formats as you type; error message derived from `formGroup().events`), `botao` (`ajj-botao`: `variante`, `carregando`, `desabilitado`, `tipo`, output `clique`), `estado-vazio` (`ajj-estado-vazio`), `barra-faixa` (`ajj-barra-faixa`, belt with 0–4 degrees), `layout-auth` (inputs `titulo`, `subtitulo`; content projected), `regras-senha` (`ajj-regras-senha`, input `senha`: live checklist of `REGRAS_SENHA`, used under every new-password field)
- `shared/validators/` (`cpfValidator`, `emailValidator` — trims before validating; `senhaForteValidator` + `REGRAS_SENHA` — min 8 chars, upper, lower, digit, special, no spaces; same rules as the API's `@SenhaForte`), `shared/utils/` (`email.util.ts`, `cpf.util.ts` with `formatarCpf`)

Rules: components never touch `sessionStorage` nor build API URLs; services do. No code comments (SCSS included). No fake data on any screen.

## Routes

Public: `''`/`login`, `cadastro`, `esquecisenha`, `verificaremail` (accepts `?email=`), `verificar?token=` and `resetar?token=` (links from API e-mails).
Logged in (`app`, behind `authGuard`, rendered inside `ShellComponent`): `/app/inicio` (default), `/app/aulas`, `/app/presenca`, `/app/financeiro`, `/app/perfil`. Login success goes to `/app/inicio`.
Old URLs redirect: `/dashboard`→`/app/inicio`, `/calendario`→`/app/aulas`, `/financeiro`→`/app/financeiro`, `/configuracoes`→`/app/perfil`. Unknown paths redirect to `''`.

## Backend endpoints used

| Method | Path | Used by |
|---|---|---|
| POST | `/auth/login` → `{token, id, nome, email, perfil}` | `AuthService.login` |
| POST | `/auth/cadastro` | `AuthService.cadastrar` |
| POST | `/auth/verificacao` `{token}` | `AuthService.verificarEmail` |
| POST | `/auth/verificacao/reenvio` `{email}` | `AuthService.reenviarVerificacao` |
| POST | `/auth/senha/esqueci` `{email}` | `AuthService.esqueciSenha` |
| POST | `/auth/senha/redefinir` `{token, novaSenha}` | `AuthService.redefinirSenha` |
| PUT | `/alunos/me/senha` `{senhaAtual, novaSenha}` | `PerfilService.alterarSenha` |

Errors come as `ProblemDetail` (`detail`, `codigo`). Login with `codigo === 'ERR003'` (account not verified) sends the user to `/verificaremail?email=`.

## Tests

Karma + Jasmine, zoneless TestBed. In specs call `fixture.detectChanges()` then `await fixture.whenStable()`. No Chrome in WSL: download `chrome-headless-shell` with `npx @puppeteer/browsers install chrome-headless-shell@stable` and set `CHROME_BIN`; run `npx ng test --watch=false --browsers=ChromeHeadless`.

E2E (Playwright, `e2e/`, config in `playwright.config.ts`; full docs and scenario list in `e2e/README.md`, keep it updated when adding tests): the stack comes from the API repo, `${ALMEIDA_API_DIR}/e2e/docker-compose.yml` (default `../almeidaPresenca`; `e2e/suporte/ambiente.ts`), and runs Postgres (tmpfs, the API's `init.sql` + `populate.sql`), Mailpit (SMTP sink, UI/API on 18025) and the API (port 18080); the front runs with `ng serve --configuration e2e` on 4300, which swaps in `src/environments/environment.e2e.ts`. Global setup/teardown start and stop the stack (`E2E_MANTER_AMBIENTE=1` keeps it). Tests create their own accounts (random e-mail/CPF) and read verification/reset links from Mailpit. Projects: `desktop` and `celular` (Pixel 7); `workers: 2` (more workers starve WSL/CI and make navigations time out). Ionic clones focused inputs on mobile (`.cloned-input`), so field locators exclude it. Not part of `npm test`. CI: `.github/workflows/e2e.yml` runs it on push/PR to `dev` against the API's `dev` branch (checked out with the `API_DEPLOY_KEY` secret, a read-only deploy key of the private API repo) (skipped via `paths-ignore` when only `*.md`, `docs/`, AI files or `src/**/*.spec.ts` change; `e2e/` changes always run it) and uploads `e2e/relatorio` as the `relatorio-e2e` artifact; the API repo has the mirror workflow (checks out this repo's `dev`). No local git hooks. Release order: when a change spans both repos, merge/push the API's `dev` first and wait for its e2e to pass, then the front (each workflow tests against the other repo's `dev`).

## Design system

- Dark "esportivo" theme, yellow accent. CSS custom properties in `src/theme/tokens.scss` (`--ajj-fundo #0B0B0C`, `--ajj-superficie`, `--ajj-superficie-2`, `--ajj-borda`, `--ajj-texto`, `--ajj-texto-suave`, `--ajj-primaria #F2CC0F` with `--ajj-sobre-primaria` text, `--ajj-perigo`, `--ajj-sucesso`; radii `--ajj-raio-p/m/g` 10/14/20 px; spacing `--ajj-espaco-*` in 4 px steps). Use the tokens instead of hard-coding colors.
- `src/theme/ionic.scss` maps tokens to `--ion-*` variables; `src/theme/componentes.scss` has global classes (`.ajj-card`, `.ajj-chip`, `.ajj-titulo`, `.ajj-numero`, `.ajj-truncar`); `src/theme/auth.scss` styles the auth screens.
- Fonts (Google Fonts, `display=swap`): Oswald 500–700 uppercase for titles/buttons/numbers, Barlow 400–600 for text. Icons: Lucide, `aria-hidden` when decorative.
- Accessibility: targets ≥ 44 px, visible focus, label on icon-only buttons, `prefers-reduced-motion`, 16 px base text.
- `public/` is served under `/assets/` (`angular.json`), so PWA files live at `/assets/manifest.webmanifest` and `/assets/icons/*`.
- Production budgets (`angular.json`): initial bundle warns at 900 kB, errors at 1.2 MB; component styles warn at 4 kB, error at 8 kB.
- UI text, routes and identifiers are in Portuguese; keep that convention.
