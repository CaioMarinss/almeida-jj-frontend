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
```

`src/environments/environment.ts` is **generated** by `scripts/set-environment.mjs` from `API_URL` (trailing slash stripped). It is tracked in git, so avoid committing a non-local URL.

## Stack

Angular 22.2, standalone components, **zoneless** change detection (no zone.js), signals for state, `ChangeDetectionStrategy.OnPush` everywhere, `inject()` for DI, SCSS, ngx-mask, SweetAlert2, `HttpClient` with `withFetch()` + functional interceptors. App config in `src/app/app.config.ts`, routes in `src/app/app.routes.ts` (all `loadComponent`, lazy).

## Structure (`src/app`)

- `core/auth/` — `SessionService` (only owner of `sessionStorage`: keys `ajj.token`, `ajj.usuario`; exposes `usuario`/`autenticado` signals; `encerrar()` logs out), `AuthService` (all `/auth/**` calls), `authGuard` (functional), `usuario.ts` (`Usuario`, `Perfil`, `ROTULO_PERFIL`)
- `core/http/` — `authInterceptor` (adds `Bearer` only to `environment.apiUrl` URLs), `sessaoExpiradaInterceptor` (401 outside `/auth/**` → logout + `/login`), `erro-api.ts` (`mensagemDeErro`/`codigoDeErro` read the API `ProblemDetail`)
- `core/notificacao/` — `Notificador` (abstract class used as DI token) + `SweetAlertNotificador`. Inject `Notificador`, never SweetAlert directly.
- `features/auth/` — `login`, `cadastro`, `esqueci-senha`, `reenviar-verificacao`, `verificar`, `redefinir-senha` (`testes-auth.ts` holds spec helpers)
- `features/inicio`, `features/aulas`, `features/financeiro` — logged-in screens (still **mocked data**), `features/perfil` (+ `PerfilService` for password change)
- `shared/ui/` — `campo` (`ControlValueAccessor` input with ngx-mask; error message derived from `formGroup().events`), `dialogo-confirmacao`, `layout-auth`, `layout-app` (reads name/profile from `SessionService`)
- `shared/validators/` (`cpfValidator`, `emailValidator` — trims before validating), `shared/utils/email.util.ts`

Rules: components never touch `sessionStorage` nor build API URLs; services do. No code comments.

## Routes

`''`/`login`, `cadastro`, `esquecisenha`, `verificaremail` (accepts `?email=`), `verificar?token=` and `resetar?token=` (public, links from API e-mails), and `dashboard`, `calendario`, `financeiro`, `configuracoes` (behind `authGuard`). Unknown paths redirect to `''`.

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

## Design system

- Dark theme, yellow accent. SCSS tokens in `src/styles/variables.scss`: `$primary-color: #F2CC0F`, `$secondary-color: #000`, `$fundo-input: #202020`, `$bg-sombra: #333333`, `$text-color: #fff`. Import them instead of hard-coding colors.
- Font: Poppins. SweetAlert popups are styled globally in `src/styles.scss` (`.app-alert-*` classes).
- Production budget: component styles warn at 4kB, error at 8kB (`angular.json`).
- UI text, routes and identifiers are in Portuguese; keep that convention.
