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

Angular 22.2, standalone components (no NgModules), zone.js change detection (`provideZoneChangeDetection`, components use `ChangeDetectionStrategy.Eager`), SCSS, ngx-mask, SweetAlert2, `HttpClient` with `withFetch()`. App config in `src/app/app.config.ts`, routes in `src/app/app.routes.ts`.

## Structure (`src/app`)

- `pages/` — one folder per route: `login`, `cadastro`, `esquecisenha`, `verificaremail`, `resetar`, `verificar`, `dashboard`, `calendario`, `financeiro`, `configuracoes`
- `components/` — `base-page` (authenticated shell: sidebar nav + header, used by dashboard/calendario/financeiro/configuracoes), `default-login-layout` (shell for auth screens), `primeiro-input` (`ControlValueAccessor` input with ngx-mask), `confirm-popup`
- `services/login/` — `LoginService` (all auth/email API calls), `AuthGuard` (class-based `CanActivate`)
- `services/alerta.service.ts` — `AlertaService`: SweetAlert2 wrapper (`success`/`error`/`warning`/`errorFromApi`). Use it for user feedback; `errorFromApi` extracts the backend's `erro` field.
- `types/` — `LoginResponse` (`token`, `id`, `name`, `email`, `isAdmin`)
- `validators/cpf.validator.ts`, `utils/email.util.ts`

## Auth / session

- Login and register call `POST /auth/login` / `POST /auth/register`; the response is saved to **sessionStorage**: `auth-token`, `username`, `user-id`, `user-email`, `user-is-admin`.
- Pages read user info directly from sessionStorage (`role` = `'Admin'` if `user-is-admin === 'true'`, else `'Aluno'`).
- No HTTP interceptor: authenticated calls set `Authorization: Bearer <token>` manually (see `LoginService.resetSenha`).
- `AuthGuard` allows `resetar` and `verificar` when the URL has `?token=` (links from backend emails); otherwise requires `auth-token` in sessionStorage, else redirects to `/login`.
- Email-link flows: `verificar` calls `GET /aluno/verificar?token=` (activates account); `resetar` and `configuracoes` call `PUT /aluno/resetar` with `{ email, novaSenha }`.

## Backend endpoints used

| Method | Path | Used by |
|---|---|---|
| POST | `/auth/login`, `/auth/register` | LoginService |
| POST | `/email/enviar-email-recuperacao`, `/email/enviar-email-verificacao` | LoginService |
| PUT | `/aluno/resetar` | LoginService (resetar, configuracoes) |
| GET | `/aluno/verificar?token=` | VerificarComponent |

Dashboard, calendário and financeiro currently use **mocked data** — no backend endpoints yet.

## Design system

- Dark theme, yellow accent. SCSS tokens in `src/styles/variables.scss`: `$primary-color: #F2CC0F`, `$secondary-color: #000`, `$fundo-input: #202020`, `$bg-sombra: #333333`, `$text-color: #fff`. Import them instead of hard-coding colors.
- Font: Poppins. SweetAlert popups are styled globally in `src/styles.scss` (`.app-alert-*` classes).
- Production budget: component styles warn at 4kB, error at 8kB (`angular.json`).
- UI text, routes and identifiers are in Portuguese; keep that convention.
