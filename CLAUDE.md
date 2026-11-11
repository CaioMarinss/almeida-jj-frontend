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

- `core/auth/` — `SessionService` (only owner of `sessionStorage`: keys `ajj.token`, `ajj.usuario`; exposes `usuario`/`autenticado` signals; `encerrar()` logs out; `sessaoValida()` also ends the session when the JWT `exp` has passed), `SaidaService` (confirm → `encerrar()` → `NavController.navigateRoot('/login')`; used by shell and perfil), `AuthService` (all `/auth/**` calls), `authGuard` (functional, redirects to `/login`), `visitanteGuard` (on `''`/`login`, sends a logged-in user to `rotaInicial`), `donoGuard` (only `perfil === 'DONO'` passes, else `rotaInicial`), `alunoGuard` (every profile except the dono; the dono is sent to `/app/chamada`), `usuario.ts` (`Usuario`, `Perfil` = `'ALUNO' | 'PROFESSOR' | 'DONO'`, `ROTULO_PERFIL`, `rotaInicial(perfil)` = `/app/chamada` for the dono, `/app/inicio` for everyone else; also the login destination)
- `core/http/` — `authInterceptor` (adds `Bearer` only to `environment.apiUrl` URLs), `sessaoExpiradaInterceptor` (401 outside `/auth/**` → logout + `/login` + "Sua sessão expirou" toast), `erro-api.ts` (`mensagemDeErro`/`codigoDeErro` read the API `ProblemDetail`)
- `core/notificacao/` — `Notificador` (abstract class used as DI token: `sucesso`, `aviso`, `erro`, `erroDaApi`, `confirmar`) + `IonicNotificador` (toasts via `ToastController`, errors/confirmations via `AlertController`; a second `confirmar` while one is open resolves `false`). Inject `Notificador`, never the Ionic controllers directly.
- `core/pwa/` — `AtualizacaoAppService` (started by `provideAppInitializer`; on `VERSION_READY` asks to update and reloads, reloads on `unrecoverable`, checks for updates when the tab becomes visible)
- `core/dono/` — `ContadoresDonoService` (signals `aptos` = apto and not yet graduado, from `GET /graduacoes/aptos`, `0` on `ERR033`; `sumidos`, from `GET /presencas/sumidos`; `atualizar()` is called by the shell when the dono's session starts and on every tab change; they feed the badges on the Graduação and Alunos tabs)
- `features/auth/` — `login`, `cadastro`, `esqueci-senha`, `reenviar-verificacao`, `verificar`, `redefinir-senha` (`testes-auth.ts` holds spec helpers)
- `features/shell/` — logged-in shell: `ion-split-pane` (side `ion-menu` at ≥ 992 px, same items as the tab bar, Perfil and Sair at the bottom) + `ion-tabs` with a bottom tab bar (hidden when the menu is visible). Tabs depend on the profile: **aluno/professor** Início · Aulas · Presença · Financeiro · Perfil; **dono** "Presenças" (`/app/chamada`) · Financeiro · "Graduação" (badge = aptos) · "Alunos" (badge = sumidos) · Perfil
- `features/inicio` (aluno/professor only: greeting, the **"Próxima aula" card** (next class of the current week with `app-botao-vou` and the "N vão" counter) and `card-graduacao` with the presence line), `features/aulas` (aluno/professor: 7-day strip with week arrows up to +4 weeks, `app-aula-card` per class with "até HH:mm", "Cancelada · motivo" and the "Avulsa" badge, day notice when the whole day is cancelled; reads `GET /agenda`), `features/presenca` (aluno/professor, tab **Presença**: "X de Y presenças até a graduação de DD/MM" with a progress bar, "Faltam N", and the list of counted presences with origin labels "contada"/"incluída pelo professor"/"incluída pelo dono", 10 at first and "Ver todas"; reads `GET /alunos/me/presencas`), `features/financeiro` (empty state only, no fake data). These three are behind `alunoGuard`
- `features/chamada` (dono, `/app/chamada`, tab "Presenças", opens on the class of the moment via `aula-inicial.ts`): week arrows ("Esta semana"/"DD/MM a DD/MM", back to the week of `ajustaDesde` from `GET /presencas/prazo` but always at least one week, 12 weeks when `ajustaDesde` is null, never into future weeks), 7 day buttons ("Segunda, DD/MM"), class buttons (`button.aula`, "N pres."), search `#busca-chamada` and two lists over `GET /alunos`: "Presentes · N" (each row shows the origin: "marcou Vou" / "incluído por você" / "incluída pelo professor" for old rows) and "Outros alunos". Tapping an "Outros alunos" row includes it; tapping a present row asks "Tirar a presença de NOME?" and removes it. Rows are disabled when the API says `podeAjustar` is false (notice "Fora do prazo: estas presenças só podem ser consultadas." or "O controle de presença abre no dia da aula."; "ajustável até DD/MM" comes from `ajustaAte`). "Editar grade" in the header goes to `/app/grade`
- `features/agenda` (dono, `/app/grade`, title "Grade": `AgendaComponent` with `ion-segment` "Grade semanal"/"Cancelamentos e extras": `grade-semanal` + `form-aula` bottom sheet to add/edit/remove weekly classes (edit and "Tirar da grade" take effect tomorrow, add takes effect today), `excecoes` + `nova-excecao` to cancel a class, cancel the whole day or create an "Aula avulsa", with undo by trash button; `dias.ts`)
- `features/graduacao` (dono, tab "Graduação", `GraduacaoComponent` = `proxima-graduacao` + `aptos`): `proxima-graduacao` is the event card ("Próxima graduação" DD/MM, "Mínimo p/ grau"/"Mínimo p/ faixa", "Alterar" schedules/changes/cancels the academy's single next date with both minimums required; cancelling when an exam exists shows the `ERR037` alert and keeps the date); `aptos` shows the summary "N aptos · N exames feitos · N graduados", an `ion-segment` "Troca de grau · N"/"Troca de faixa · N" with an inline list (apto/graduado first, then "Ainda não aptos"); row buttons **Exame** (no exam yet), **Ver** (reopens the exam) and **Graduou** (approved exam + apto, enabled only from the event date; opens the faixa/grau confirmation prefilled with the API suggestion), status "Aprovado · nota 8,5"/"Reprovado · nota 4,0"/"Graduado"; no current event (`ERR033`) shows an empty state. `exame/ExameComponent` is the bottom sheet: Aprovado/Reprovado, "Nota (0 a 10)" (comma, one decimal), "Observação (opcional)" (200), "Já registrar a graduação (…)" (only for an approved apto student once the event date has come; sent as `graduar` in the same request), "Salvar exame", "Remover exame" (confirmation) and "Cancelar"
- `features/alunos` (dono, tab "Alunos"): `AlunosComponent` at `/app/alunos` reads `AlunosService.painel()` (cached in the `painelEmCache` signal, kept in sync via `atualAlterada$` and `alterarEmCache`), accent-insensitive search `#busca-aluno`, chips "Todos" / "Sumidos · N" / "Professores" (`role=group` "Filtrar alunos"), belt `select` `#filtro-faixa` (Infantil/Adulto/Mestres + "Sem graduação"), 7 per page, "N alunos"; each row (`li.aluno`) links to `/app/alunos/:id` with the last-training text (`ultimo-treino.ts`: "treinou hoje", "treinou ontem", "há N dias", "sumido · N dias"). `ficha/FichaAlunoComponent` (`/app/alunos/:id`): header with belt, cargo chip and "Tornar professor"/"Voltar a aluno" (confirmation; none for the dono), the numbers "Presenças no ciclo"/"Último treino"/"Último exame" and an `ion-segment` Presenças (`presencas-aluno`, `GET /graduacoes/alunos/{id}/presencas`) / Graduações (`registro-graduacao`: registers belt/degree with history and removes records with a trash button; the current belt is computed by the API) / Exames (`exames-aluno`, `GET /alunos/{id}/exames`); an unknown id shows an empty state
- `features/perfil` (every profile): name, e-mail and cargo chip, a "Trocar senha" row that opens `perfil/trocar-senha/TrocarSenhaComponent` (`/app/perfil/senha`, back arrow to Perfil, uses `PerfilService`; logs out after success) and "Sair da conta". No name editing until the API has `PUT /alunos/me`
- `shared/alunos/` (`AlunosService`: `painel()`, `listar()`, `alterarPerfil()`, `painelEmCache`/`alterarEmCache`; `alunos.model.ts`), `shared/graduacao/` (`GraduacaoService` incl. `registrarExame`/`removerExame`/`exames`/`graduou` and `atualAlterada$`, which emits `{idAluno, atual}` after a record is registered or removed so the list and the ficha update without reloading; `graduacao.model.ts`; `descrever.ts` with `formatarNota` and São Paulo dates), `shared/presenca/` (`PresencaService`, `presenca.model.ts` with `ROTULO_ORIGEM`, `vou.ts` helpers, `resumo.ts`, and `botao-vou` = `app-botao-vou`: "Vou"/"✓ Vou" with `aria-pressed` and `aria-label="Vou na aula das HH:mm"` while `podeMarcar`, otherwise "Presença contada"/"Janela fechada" after the window closes (class end + 30 min); used by `app-aula-card` and the Início card), `shared/agenda/` (`AgendaService`, `agenda.model.ts`, `datas.ts` with São Paulo date helpers), `shared/utils/texto.util.ts` (accent/case-insensitive normalization), `shared/utils/lista-fixada.ts` (keeps the changed row visible and the counter/page frozen until the search, filter or page changes) and `shared/ui/paginacao` (`ajj-paginacao`: Anterior/Próxima/"Página X de Y")
- `features/testes-app.ts` holds spec helpers. `src/app/limpar-overlays.spec.ts` is a global `afterEach` (loaded by Karma with the other specs) that removes leftover `ion-modal`/`ion-alert`/`ion-toast`/`ion-popover`/`ion-action-sheet`/`ion-loading` elements so an overlay left by one spec cannot break the next one.
- `shared/ui/` — `campo` (`ControlValueAccessor` over `ion-input`; `formato="cpf"` formats as you type; error message derived from `formGroup().events`), `botao` (`ajj-botao`: `variante`, `carregando`, `desabilitado`, `tipo`, output `clique`), `estado-vazio` (`ajj-estado-vazio`), `barra-faixa` (`ajj-barra-faixa`, belt with degree stripes: kids up to 10, Preta 6, adult colors 4, masters none; red tip on the black belt, black tip otherwise), `layout-auth` (inputs `titulo`, `subtitulo`; content projected), `regras-senha` (`ajj-regras-senha`, input `senha`: live checklist of `REGRAS_SENHA`, used under every new-password field)
- `shared/validators/` (`cpfValidator`, `emailValidator` — trims before validating; `senhaForteValidator` + `REGRAS_SENHA` — min 8 chars, upper, lower, digit, special, no spaces; same rules as the API's `@SenhaForte`), `shared/utils/` (`email.util.ts`, `cpf.util.ts` with `formatarCpf`)

Rules: components never touch `sessionStorage` nor build API URLs; services do. No code comments (SCSS included). No fake data on any screen.

## Routes

Public: `''`/`login`, `cadastro`, `esquecisenha`, `verificaremail` (accepts `?email=`), `verificar?token=` and `resetar?token=` (links from API e-mails).
Logged in (`app`, behind `authGuard`, rendered inside `ShellComponent`): `/app/financeiro`, `/app/perfil` and `/app/perfil/senha` for everyone; `/app/inicio` (default), `/app/aulas`, `/app/presenca` behind `alunoGuard` (the dono is sent to `/app/chamada`); `/app/chamada`, `/app/grade`, `/app/graduacao`, `/app/alunos` and `/app/alunos/:id` behind `donoGuard` (professor and aluno are sent to `/app/inicio`). Redirects: `/app/agenda` → `/app/grade`, `/app/professores` and `/app/sumidos` → `/app/alunos`. Roles are a ladder DONO > PROFESSOR > ALUNO; the label shown is the user's `perfil`; the professor sees the same screens as the aluno (the roll call is dono-only). Login success goes to `rotaInicial(perfil)`: `/app/chamada` for the dono, `/app/inicio` for the others.
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
| PUT | `/alunos/me/senha` `{senhaAtual, novaSenha}` | `PerfilService.alterarSenha` (`TrocarSenhaComponent`) |
| GET | `/alunos` → `[{id, nome, email, perfil}]` (dono only; professor 403) | `AlunosService.listar` (chamada) |
| GET | `/alunos/painel` (dono) → `[{id, nome, email, perfil, atual, ultimaPresenca, diasSemTreinar, sumido}]` | `AlunosService.painel` |
| GET | `/alunos/me/graduacao` → `{atual, historico, proxima}` | `GraduacaoService.minha` |
| GET | `/graduacoes/faixas`, `/graduacoes/alunos` (dono; the whole array `[{id, nome, email, perfil, atual}]`, no params), `/alunos/{id}/graduacoes` (dono) | `GraduacaoService` |
| POST | `/alunos/{id}/graduacoes` `{idGraduacao, grau, data?}` (dono; 201 returns the record plus `atual`) | `GraduacaoService.registrar` |
| DELETE | `/alunos/{id}/graduacoes/{idRegistro}` (dono) → 200 `{atual}`; 404 `ERR009` (student) / `ERR015` (record) | `GraduacaoService.remover` |
| GET/PUT/DELETE | `/graduacoes/proxima` → `{data, minimoGrau, minimoFaixa}` (PUT `{data, minimoGrau, minimoFaixa}` and DELETE dono; the form requires both minimums; DELETE 422 `ERR037` when an exam is registered) | `GraduacaoService.proxima/agendar/cancelar` |
| GET | `/graduacoes/aptos` (dono) → `{evento, grau: [...], faixa: [...]}` with `{id, nome, atual, contadas, minimo, apto, sugestao, exame, graduado}`; 404 `ERR033` without an event | `GraduacaoService.aptos` |
| POST | `/graduacoes/aptos/{idAluno}` `{idGraduacao?, grau?}` (dono; 201; empty body uses the suggestion; only from the event date: 422 `ERR031`, not apto: 422 `ERR032`, no approved exam: 422 `ERR035`) | `GraduacaoService.graduou` |
| PUT/DELETE | `/graduacoes/aptos/{idAluno}/exame` (dono; PUT `{aprovado, nota, observacao?, graduar?: {idGraduacao?, grau?}}` → 200 `{exame, graduacao}` replacing the active exam, with `graduar` nothing is saved if the graduation is refused; DELETE 204, 404 `ERR036`) | `GraduacaoService.registrarExame/removerExame` |
| GET | `/alunos/{id}/exames` (dono) → `[{id, evento: {id, data}, aprovado, nota, observacao}]` | `GraduacaoService.exames` |
| POST/DELETE | `/agenda/{data}/aulas/{idAula}/presenca` (every user; current week and open window only: 422 `ERR025`/`ERR026`; 409 `ERR027` already marked) | `PresencaService.marcar/desmarcar` |
| GET | `/alunos/me/presencas` → `{ciclo, presencas}` (counted presences) | `PresencaService.minhas` |
| GET | `/presencas/prazo` → `{ajustaDesde}` (dono) | `PresencaService.prazo` |
| GET | `/presencas/sumidos` → `{dias, alunos}` (dono; only feeds the Alunos tab badge) | `PresencaService.sumidos` (`ContadoresDonoService`) |
| GET | `/graduacoes/alunos/{id}/presencas` → `{ciclo, presencas}` (dono) | `PresencaService.doAluno` |
| GET/POST | `/agenda/{data}/aulas/{idAula}/presencas` → `{presencas, podeAjustar, ajustaAte}` / `{idAluno}` (dono only; professor 403; 422 `ERR029` outside the deadline) | `PresencaService.chamada/incluir` |
| DELETE | `/agenda/{data}/aulas/{idAula}/presencas/{idAluno}` (dono) | `PresencaService.tirar` |
| GET | `/agenda?inicio=&fim=` → `[{data, diaCancelado, aulas}]` (every user) | `AgendaService.agenda` |
| GET/POST/PUT/DELETE | `/aulas/grade`, `/aulas/grade/{id}` (writes dono; edit and removal take effect tomorrow, add today) | `AgendaService.grade/criarAula/editarAula/tirarDaGrade` |
| GET | `/agenda/excecoes` (dono) | `AgendaService.excecoes` |
| POST/DELETE | `/agenda/cancelamentos` `{data, idAula?, motivo?}` / `/agenda/cancelamentos/{id}` (dono; no `idAula` cancels the whole day; past date → 400 `ERR018`; a class whose presence window already closed → 422 `ERR030`; cancelling deactivates the open marks) | `AgendaService.cancelar/desfazerCancelamento` |
| POST/DELETE | `/agenda/avulsas` `{data, inicio, fim, modalidade, motivo?}` / `/agenda/avulsas/{id}` (dono) | `AgendaService.criarAvulsa/removerAvulsa` |
| PUT | `/alunos/{id}/perfil` `{perfil: 'PROFESSOR' \| 'ALUNO'}` (dono) | `AlunosService.alterarPerfil` (ficha) |

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
