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

- `core/auth/` — `SessionService` (only owner of `sessionStorage`: keys `ajj.token`, `ajj.usuario`; exposes `usuario`/`autenticado` signals; `encerrar()` logs out; `sessaoValida()` also ends the session when the JWT `exp` has passed), `SaidaService` (confirm → `encerrar()` → `NavController.navigateRoot('/login')`; used by shell and perfil), `AuthService` (all `/auth/**` calls), `authGuard` (functional, redirects to `/login`), `visitanteGuard` (on `''`/`login`, sends a logged-in user to `/app/inicio`), `donoGuard` (functional, only `perfil === 'DONO'` passes, else `/app/inicio`), `professorGuard` (PROFESSOR or DONO, else `/app/inicio`), `usuario.ts` (`Usuario`, `Perfil` = `'ALUNO' | 'PROFESSOR' | 'DONO'`, `ROTULO_PERFIL`)
- `core/http/` — `authInterceptor` (adds `Bearer` only to `environment.apiUrl` URLs), `sessaoExpiradaInterceptor` (401 outside `/auth/**` → logout + `/login` + "Sua sessão expirou" toast), `erro-api.ts` (`mensagemDeErro`/`codigoDeErro` read the API `ProblemDetail`)
- `core/notificacao/` — `Notificador` (abstract class used as DI token: `sucesso`, `aviso`, `erro`, `erroDaApi`, `confirmar`) + `IonicNotificador` (toasts via `ToastController`, errors/confirmations via `AlertController`; a second `confirmar` while one is open resolves `false`). Inject `Notificador`, never the Ionic controllers directly.
- `core/pwa/` — `AtualizacaoAppService` (started by `provideAppInitializer`; on `VERSION_READY` asks to update and reloads, reloads on `unrecoverable`, checks for updates when the tab becomes visible)
- `features/auth/` — `login`, `cadastro`, `esqueci-senha`, `reenviar-verificacao`, `verificar`, `redefinir-senha` (`testes-auth.ts` holds spec helpers)
- `features/shell/` — logged-in shell: `ion-split-pane` (side `ion-menu` at ≥ 992 px) + `ion-tabs` with a bottom tab bar (hidden when the menu is visible)
- `features/financeiro` — logged-in screen, **empty state only** (no fake data); `features/inicio` (greeting, "Controle de presença" shortcut for professor/dono, the **"Próxima aula" card** (next class of the current week with the `app-botao-vou` button and "N vão" counter; replaced the old "Check-in em breve"), `app-card-graduacao` with the presence line, and the dono's `area-dono`); `features/presenca` (aba **Presença**: "X de Y presenças até a graduação de DD/MM" with a progress bar, "Faltam N", and the list of counted presences with origin labels "contada"/"incluída pelo professor"/"incluída pelo dono", 10 at first and "Ver todas"; reads `GET /alunos/me/presencas`); `features/chamada` (**Controle de presença**, `/app/chamada`, PROFESSOR and DONO via `professorGuard`: 7 day buttons (labelled "Segunda, DD/MM") with week arrows: "Esta semana"/"DD/MM a DD/MM", back to the week of `ajustaDesde` from `GET /presencas/prazo` but always at least one week (professor's previous week is read-only), 12 weeks when `ajustaDesde` is null, never into future weeks, class list with "N presenças", and for the chosen class the list of who is in with the origin and who registered; "Tirar" (confirmation) and "+ Incluir aluno" (`incluir-aluno` bottom sheet with search `#busca-incluir` over `GET /alunos`; tapping a row toggles it (`aria-pressed`), "Incluir N alunos" posts them one by one, ERR027 counts as included, the first other error stops and reloads what already went in) only when the API says `podeAjustar`, otherwise the notice "Fora do prazo: estas presenças só podem ser consultadas."; "Professor pode ajustar até DD/MM"/"Dono pode ajustar até DD/MM" comes from `ajustaAte`); `shared/presenca/` (`PresencaService`, `presenca.model.ts` with `ROTULO_ORIGEM`, `vou.ts` helpers `textoVao`/`aplicarPresenca`, and `botao-vou` = `app-botao-vou`: "Vou"/"✓ Vou" with `aria-pressed` and `aria-label="Vou na aula das HH:mm"` while `podeMarcar`, otherwise the status "Presença contada"/"Janela fechada" after the window closes (class end + 30 min); used by `app-aula-card` and the Início card); `features/aulas` (every user: 7-day strip with week arrows up to +4 weeks, `app-aula-card` per class with "até HH:mm", "Cancelada · motivo" and the "Avulsa" badge, day notice when the whole day is cancelled; reads `GET /agenda`), `features/agenda` (dono only, `AgendaComponent` with `ion-segment` "Grade semanal"/"Exceções": `grade-semanal` + `form-aula` bottom sheet to add/edit/remove weekly classes (edit and "Tirar da grade" take effect tomorrow, add takes effect today), `excecoes` + `nova-excecao` to cancel a class, cancel the whole day or create an "Aula avulsa", with undo by trash button; `dias.ts`), `shared/agenda/` (`AgendaService`, `agenda.model.ts`, `datas.ts` with São Paulo date helpers); `features/perfil` (+ `PerfilService` for password change; no name editing until the API has `PUT /alunos/me`; shows a "Gerenciar professores" button only to the dono), `features/graduacao` (dono only: `GraduacaoComponent` loads the whole list once (`GET /graduacoes/alunos`) and filters in memory: accent/case-insensitive name search, belt filter, 7 per page via `ajj-paginacao`, "N alunos" counter, no "Carregar mais"; `proxima-graduacao` is a compact line with "Alterar" (schedule/change/cancel the academy's single next date, with the two required minimums "Mínimo para grau"/"Mínimo para faixa", shown on the line as "Mínimo: N grau · M faixa" or "mínimo não definido"); `aptos` ("Ver aptos" modal: sections "Troca de grau"/"Troca de faixa", aptos first with "34/30" and "Graduou" — enabled only from the event date — then "faltam N"; "Graduou" opens a faixa/grau confirmation prefilled with the API suggestion; no current event, ERR033, shows an empty state); `registro-graduacao` modal shows `presencas-aluno` (`GET /graduacoes/alunos/{id}/presencas`: cycle summary via `shared/presenca/resumo.ts`, 5 presences then "Ver todas"), registers belt/degree with history and lets the dono remove a record (trash button, confirmation says whether the current belt changes; the current belt is computed by the API from the history); `GraduacaoService` in `shared/graduacao/` plus `graduacao.model.ts` and `descrever.ts`), `features/professores` (dono only: lists active people via `GET /alunos` in memory with accent-insensitive search `#busca-pessoa`, cargo chips Todos/Professores/Alunos, 7 per page, "N pessoas"; tapping a row (`button.linha`) opens a bottom sheet to toggle Aluno ↔ Professor with the existing confirmation; `ProfessoresService`, `PessoaAcademia`), `features/inicio/area-dono` ("Área do dono" card with shortcuts to Professores, Agenda, Graduações and Sumidos, only for the dono), `features/sumidos` (dono only, `/app/sumidos`: list from `GET /presencas/sumidos` with "Último treino DD/MM · há N dias"). Shared by both lists: `shared/utils/texto.util.ts` (accent/case-insensitive normalization), `shared/utils/lista-fixada.ts` (keeps the changed row visible and the counter/page frozen until the search, filter or page changes) and `shared/ui/paginacao` (`ajj-paginacao`: Anterior/Próxima/"Página X de Y"). `GraduacaoService.atualAlterada$` emits `{idAluno, atual}` after a record is registered or removed so the list row and the panel header update without reloading. `features/testes-app.ts` holds spec helpers. `src/app/limpar-overlays.spec.ts` is a global `afterEach` (loaded by Karma with the other specs) that removes leftover `ion-modal`/`ion-alert`/`ion-toast`/`ion-popover`/`ion-action-sheet`/`ion-loading` elements so an overlay left by one spec cannot break the next one.
- `shared/ui/` — `campo` (`ControlValueAccessor` over `ion-input`; `formato="cpf"` formats as you type; error message derived from `formGroup().events`), `botao` (`ajj-botao`: `variante`, `carregando`, `desabilitado`, `tipo`, output `clique`), `estado-vazio` (`ajj-estado-vazio`), `barra-faixa` (`ajj-barra-faixa`, belt with degree stripes: kids up to 10, Preta 6, adult colors 4, masters none; red tip on the black belt, black tip otherwise), `layout-auth` (inputs `titulo`, `subtitulo`; content projected), `regras-senha` (`ajj-regras-senha`, input `senha`: live checklist of `REGRAS_SENHA`, used under every new-password field)
- `shared/validators/` (`cpfValidator`, `emailValidator` — trims before validating; `senhaForteValidator` + `REGRAS_SENHA` — min 8 chars, upper, lower, digit, special, no spaces; same rules as the API's `@SenhaForte`), `shared/utils/` (`email.util.ts`, `cpf.util.ts` with `formatarCpf`)

Rules: components never touch `sessionStorage` nor build API URLs; services do. No code comments (SCSS included). No fake data on any screen.

## Routes

Public: `''`/`login`, `cadastro`, `esquecisenha`, `verificaremail` (accepts `?email=`), `verificar?token=` and `resetar?token=` (links from API e-mails).
Logged in (`app`, behind `authGuard`, rendered inside `ShellComponent`): `/app/inicio` (default), `/app/aulas`, `/app/presenca`, `/app/financeiro`, `/app/perfil`, `/app/chamada` (`professorGuard`: professor and dono; side menu item "Controle de presença" and the "Controle de presença" shortcut on Início only for them), `/app/professores`, `/app/agenda`, `/app/graduacao` and `/app/sumidos` (all `donoGuard`; side menu items only for the dono, no tab — on mobile they are reached from the "Agenda" shortcut on Início or "Gerenciar agenda" in Perfil). `/app/inicio` shows the graduation card (`features/inicio/card-graduacao`) for every user. Roles are a ladder DONO > PROFESSOR > ALUNO; the label shown is the user's `perfil`. Login success goes to `/app/inicio`.
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
| GET | `/alunos` → `[{id, nome, email, perfil}]` (professor/dono) | `ProfessoresService.listar` |
| GET | `/alunos/me/graduacao` → `{atual, historico, proxima}` | `GraduacaoService.minha` |
| GET | `/graduacoes/faixas`, `/graduacoes/alunos` (dono; the whole array `[{id, nome, email, perfil, atual}]`, no params), `/alunos/{id}/graduacoes` (dono) | `GraduacaoService` |
| POST | `/alunos/{id}/graduacoes` `{idGraduacao, grau, data?}` (dono; 201 returns the record plus `atual`) | `GraduacaoService.registrar` |
| DELETE | `/alunos/{id}/graduacoes/{idRegistro}` (dono) → 200 `{atual}`; 404 `ERR009` (student) / `ERR015` (record) | `GraduacaoService.remover` |
| GET/PUT/DELETE | `/graduacoes/proxima` → `{data, minimoGrau, minimoFaixa}` (PUT `{data, minimoGrau, minimoFaixa}` and DELETE dono; the form requires both minimums) | `GraduacaoService.proxima/agendar/cancelar` |
| GET | `/graduacoes/aptos` (dono) → `{evento, grau: [...], faixa: [...]}` with `{id, nome, atual, contadas, minimo, apto, sugestao}`; 404 `ERR033` without an event | `GraduacaoService.aptos` |
| POST | `/graduacoes/aptos/{idAluno}` `{idGraduacao?, grau?}` (dono; 201; empty body uses the suggestion; only from the event date: 422 `ERR031`, not apto: 422 `ERR032`) | `GraduacaoService.graduou` |
| POST/DELETE | `/agenda/{data}/aulas/{idAula}/presenca` (every user; current week and open window only: 422 `ERR025`/`ERR026`; 409 `ERR027` already marked) | `PresencaService.marcar/desmarcar` |
| GET | `/alunos/me/presencas` → `{ciclo, presencas}` (counted presences) | `PresencaService.minhas` |
| GET | `/presencas/prazo` → `{ajustaDesde}` (professor/dono) | `PresencaService.prazo` |
| GET | `/presencas/sumidos` → `{dias, alunos}` (dono) | `PresencaService.sumidos` |
| GET | `/graduacoes/alunos/{id}/presencas` → `{ciclo, presencas}` (dono) | `PresencaService.doAluno` |
| GET/POST | `/agenda/{data}/aulas/{idAula}/presencas` → `{presencas, podeAjustar, ajustaAte}` / `{idAluno}` (professor/dono; 422 `ERR029` outside the deadline) | `PresencaService.chamada/incluir` |
| DELETE | `/agenda/{data}/aulas/{idAula}/presencas/{idAluno}` (professor/dono) | `PresencaService.tirar` |
| GET | `/agenda?inicio=&fim=` → `[{data, diaCancelado, aulas}]` (every user) | `AgendaService.agenda` |
| GET/POST/PUT/DELETE | `/aulas/grade`, `/aulas/grade/{id}` (writes dono; edit and removal take effect tomorrow, add today) | `AgendaService.grade/criarAula/editarAula/tirarDaGrade` |
| GET | `/agenda/excecoes` (dono) | `AgendaService.excecoes` |
| POST/DELETE | `/agenda/cancelamentos` `{data, idAula?, motivo?}` / `/agenda/cancelamentos/{id}` (dono; no `idAula` cancels the whole day; past date → 400 `ERR018`; a class whose presence window already closed → 422 `ERR030`; cancelling deactivates the open marks) | `AgendaService.cancelar/desfazerCancelamento` |
| POST/DELETE | `/agenda/avulsas` `{data, inicio, fim, modalidade, motivo?}` / `/agenda/avulsas/{id}` (dono) | `AgendaService.criarAvulsa/removerAvulsa` |
| PUT | `/alunos/{id}/perfil` `{perfil: 'PROFESSOR' \| 'ALUNO'}` (dono) | `ProfessoresService.alterarPerfil` |

Errors come as `ProblemDetail` (`detail`, `codigo`). Login with `codigo === 'ERR003'` (account not verified) sends the user to `/verificaremail?email=`.

## Tests

Karma + Jasmine, zoneless TestBed. In specs call `fixture.detectChanges()` then `await fixture.whenStable()`. No Chrome in WSL: download `chrome-headless-shell` with `npx @puppeteer/browsers install chrome-headless-shell@stable` and set `CHROME_BIN`; run `npx ng test --watch=false --browsers=ChromeHeadless`.

E2E (Playwright, `e2e/`, config in `playwright.config.ts`; full docs and scenario list in `e2e/README.md`, keep it updated when adding tests): the stack comes from the API repo, `${ALMEIDA_API_DIR}/e2e/docker-compose.yml` (default `../almeidaPresenca`; `e2e/suporte/ambiente.ts`), and runs Postgres (tmpfs, the API's `init.sql` + `populate.sql`), Mailpit (SMTP sink, UI/API on 18025) and the API (port 18080); the front runs with `ng serve --configuration e2e` on 4300, which swaps in `src/environments/environment.e2e.ts`. Global setup/teardown start and stop the stack (`E2E_MANTER_AMBIENTE=1` keeps it). Tests create their own accounts (random e-mail/CPF) and read verification/reset links from Mailpit. Projects: `desktop` and `celular` (Pixel 7); `workers: 2` (more workers starve WSL/CI and make navigations time out). Ionic clones focused inputs on mobile (`.cloned-input`), so field locators exclude it. Not part of `npm test`. CI: `.github/workflows/e2e.yml` is **optional since 2026-11-09** (`workflow_dispatch` only, no push/PR trigger); it runs against the API's `dev` branch (checked out with the `API_DEPLOY_KEY` secret, a read-only deploy key of the private API repo) and uploads `e2e/relatorio` as the `relatorio-e2e` artifact; the API repo has the mirror workflow (checks out this repo's `dev`). No local git hooks. Release order: when a change spans both repos, push the API's `dev` first, then the front; in prod the API goes live before the front.

## Design system

- Dark "esportivo" theme, yellow accent. CSS custom properties in `src/theme/tokens.scss` (`--ajj-fundo #0B0B0C`, `--ajj-superficie`, `--ajj-superficie-2`, `--ajj-borda`, `--ajj-texto`, `--ajj-texto-suave`, `--ajj-primaria #F2CC0F` with `--ajj-sobre-primaria` text, `--ajj-perigo`, `--ajj-sucesso`; radii `--ajj-raio-p/m/g` 10/14/20 px; spacing `--ajj-espaco-*` in 4 px steps). Use the tokens instead of hard-coding colors.
- `src/theme/ionic.scss` maps tokens to `--ion-*` variables; `src/theme/componentes.scss` has global classes (`.ajj-card`, `.ajj-chip`, `.ajj-titulo`, `.ajj-numero`, `.ajj-truncar`, `.ajj-chip-modalidade` with the modalidade colors; tokens `--ajj-modalidade-kids` and `--ajj-modalidade-teens`); `src/theme/auth.scss` styles the auth screens.
- Fonts (Google Fonts, `display=swap`): Oswald 500–700 uppercase for titles/buttons/numbers, Barlow 400–600 for text. Icons: Lucide, `aria-hidden` when decorative.
- Accessibility: targets ≥ 44 px, visible focus, label on icon-only buttons, `prefers-reduced-motion`, 16 px base text.
- `public/` is served under `/assets/` (`angular.json`), so PWA files live at `/assets/manifest.webmanifest` and `/assets/icons/*`.
- Production budgets (`angular.json`): initial bundle warns at 900 kB, errors at 1.2 MB; component styles warn at 4 kB, error at 8 kB.
- UI text, routes and identifiers are in Portuguese; keep that convention.
