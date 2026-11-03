# Refatoração SOLID do front — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o front em `core` / `features` / `shared`, com sessão centralizada, interceptors, signals, OnPush e zoneless, consumindo o novo contrato da API sem mudar o visual.

**Architecture:** `core` concentra sessão, autenticação, HTTP e notificação; `features` tem uma pasta por área com rotas lazy; `shared` tem componentes de UI, validadores e utilitários. Componentes não acessam `sessionStorage` nem montam URLs da API.

**Tech Stack:** Angular 22 standalone, TypeScript 6, signals, SweetAlert2, ngx-mask, Karma/Jasmine.

**Spec:** `../almeidaPresenca/docs/superpowers/specs/2026-11-01-solid-refatoracao-design.md`. Depende do contrato implementado em `../almeidaPresenca/docs/superpowers/plans/2026-11-02-solid-api.md`.

## Global Constraints

- Branch `refactor/solid` a partir de `dev`. Um commit por tarefa; sem atribuição a Claude.
- Injeção com `inject()`. Estado com signals. Todos os componentes com `ChangeDetectionStrategy.OnPush`.
- Sem comentários explicativos no código. Sem mudança visual (HTML/SCSS só mudam onde a tarefa exigir: seletores, bindings, campo "senha atual").
- URLs do front mantidas: `/login`, `/cadastro`, `/esquecisenha`, `/verificaremail`, `/verificar`, `/resetar`, `/dashboard`, `/calendario`, `/financeiro`, `/configuracoes`; `''` → login.
- Contrato da API (do design):
  - `POST /auth/login` `{email, senha}` → `{token, id, nome, email, perfil}`; `401 ERR004`; `403 ERR003` (conta inativa).
  - `POST /auth/cadastro` `{nome, cpf, email, senha}` → 201.
  - `POST /auth/verificacao` `{token}` → 204; `POST /auth/verificacao/reenvio` `{email}` → 202.
  - `POST /auth/senha/esqueci` `{email}` → 202; `POST /auth/senha/redefinir` `{token, novaSenha}` → 204.
  - `GET /alunos/me` → `{id, nome, email, perfil}`; `PUT /alunos/me/senha` `{senhaAtual, novaSenha}` → 204.
  - Erros em `ProblemDetail`: mensagem em `detail`, código em `codigo`.
- `perfil`: `'ALUNO' | 'PROFESSOR'`; rótulo exibido `Aluno` / `Professor`.
- Testes: `export API_URL=http://localhost:8080 CHROME_BIN=<chrome-headless-shell>; npx ng test --watch=false --browsers=ChromeHeadless` (no WSL, baixar com `npx @puppeteer/browsers install chrome-headless-shell@stable` numa pasta temporária).

## Review Focus

1. Sessão salva pelo formato antigo (`auth-token`, `username`, … no `sessionStorage`) ao abrir o app depois do deploy → tratada como deslogada, sem erro no console. Teste na Tarefa 2.
2. Token expirado durante o uso (API responde 401 numa rota autenticada) → sessão limpa e redirecionamento para `/login`; um 401 do próprio `/auth/login` não desloga nem redireciona. Teste na Tarefa 3.
3. Erro sem `ProblemDetail` (rede caída, `status 0`, HTML de proxy) → mensagem padrão, nunca `[object Object]` nem texto HTML. Teste na Tarefa 1.
4. Link de e-mail aberto sem `token` em `/verificar` ou `/resetar` → mensagem de link inválido, sem chamada à API. Teste na Tarefa 5.
5. Login de conta não verificada (`403 ERR003`) → aviso e caminho para reenviar a verificação, com o e-mail já preenchido. Teste na Tarefa 5.

---

### Tarefa 1: Notificação e leitura de erros da API

**Files:**
- Create: `src/app/core/notificacao/notificador.ts`, `src/app/core/notificacao/sweet-alert-notificador.ts`, `src/app/core/http/erro-api.ts`
- Modify: `src/app/app.config.ts` (provider `{ provide: Notificador, useClass: SweetAlertNotificador }`)
- Test: `src/app/core/http/erro-api.spec.ts`, `src/app/core/notificacao/sweet-alert-notificador.spec.ts`

**Interfaces:**
- Produces:
  - `abstract class Notificador { abstract sucesso(mensagem: string): Promise<void>; abstract erro(mensagem: string): Promise<void>; abstract aviso(mensagem: string): Promise<void>; abstract erroDaApi(erro: unknown, padrao?: string): Promise<void>; }`
  - `SweetAlertNotificador` — mesmas opções visuais do `AlertaService` atual (classes `app-alert-*`, `buttonsStyling: false`, `heightAuto: false`, `scrollbarPadding: false`).
  - `erro-api.ts`: `mensagemDeErro(erro: unknown, padrao = 'Algo deu errado!'): string` (usa `erro.error.detail` quando for string não vazia; senão `padrao`) e `codigoDeErro(erro: unknown): string | undefined` (`erro.error.codigo`).

- [ ] **Passo 1: Escrever `erro-api.spec.ts`**
  - `HttpErrorResponse` com `error: { detail: 'E-mail já cadastrado.', codigo: 'ERR005' }` → mensagem `'E-mail já cadastrado.'`, código `'ERR005'`.
  - `status: 0` sem corpo → `padrao`.
  - `error: '<html>Bad Gateway</html>'` → `padrao`.
  - `error: { detail: '' }` → `padrao`.
  - `undefined` → `padrao`; `codigoDeErro(undefined)` → `undefined`.
- [ ] **Passo 2: Escrever `sweet-alert-notificador.spec.ts`**: com `spyOn(Swal, 'fire')`, `erroDaApi(httpErroComDetail)` chama `fire` com `icon: 'error'` e `text` igual ao `detail`.
- [ ] **Passo 3: Rodar e ver falhar** (comando de testes das Global Constraints) → falha de compilação.
- [ ] **Passo 4: Implementar.**
- [ ] **Passo 5: Rodar e ver passar.**
- [ ] **Passo 6: Commit** — `git commit -m "refactor(front): Notificador e leitura de ProblemDetail"`

---

### Tarefa 2: Sessão e serviço de autenticação

**Files:**
- Create: `src/app/core/auth/usuario.ts`, `src/app/core/auth/session.service.ts`, `src/app/core/auth/auth.service.ts`, `src/app/core/auth/auth.guard.ts`
- Test: `src/app/core/auth/session.service.spec.ts`, `auth.service.spec.ts`, `auth.guard.spec.ts`

**Interfaces:**
- Produces:
  - `type Perfil = 'ALUNO' | 'PROFESSOR'`; `interface Usuario { id: number; nome: string; email: string; perfil: Perfil }`; `const ROTULO_PERFIL: Record<Perfil, string> = { ALUNO: 'Aluno', PROFESSOR: 'Professor' }`.
  - `SessionService` (`providedIn: 'root'`), chaves `ajj.token` e `ajj.usuario` no `sessionStorage`:
    - `readonly usuario: Signal<Usuario | null>`; `readonly autenticado: Signal<boolean>`
    - `token(): string | null`
    - `iniciar(token: string, usuario: Usuario): void`
    - `atualizarNome(nome: string): void`
    - `encerrar(): void` — remove as duas chaves e zera os signals.
    - Ao construir: lê as chaves; JSON inválido ou ausente → deslogado.
  - `AuthService` (`providedIn: 'root'`), base `environment.apiUrl + '/auth'`:
    - `login(email: string, senha: string): Observable<Usuario>` — chama a API, `iniciar(token, {id, nome, email, perfil})`, emite o `Usuario`.
    - `cadastrar(dados: { nome: string; cpf: string; email: string; senha: string }): Observable<void>` — não mexe na sessão.
    - `verificarEmail(token: string): Observable<void>`
    - `reenviarVerificacao(email: string): Observable<void>`
    - `esqueciSenha(email: string): Observable<void>`
    - `redefinirSenha(token: string, novaSenha: string): Observable<void>`
  - `authGuard: CanActivateFn` — autenticado → `true`; senão `UrlTree` para `/login`.

- [ ] **Passo 1: Escrever os specs**
  - Session: `iniciarPersisteERecupera` (nova instância lê o mesmo usuário); `encerrarLimpaTudo`; `jsonCorrompidoEhDeslogado`; `formatoAntigoEhDeslogado` (só `auth-token` e `username` definidos → `autenticado() === false`); `atualizarNomeMudaSignalESessao`.
  - AuthService (com `provideHttpClient()` + `provideHttpClientTesting()`): `loginPostaEIniciaSessao` (URL `${apiUrl}/auth/login`, corpo `{email, senha}`, sessão com `perfil`); `cadastroNaoIniciaSessao`; `redefinirEnviaTokenNoCorpo` (`{token, novaSenha}`); `verificarEnviaTokenNoCorpo`.
  - Guard: `semSessaoRedirecionaParaLogin` (UrlTree `/login`); `comSessaoLibera`.
- [ ] **Passo 2: Rodar e ver falhar.**
- [ ] **Passo 3: Implementar.**
- [ ] **Passo 4: Rodar e ver passar.**
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): SessionService, AuthService e authGuard"`

---

### Tarefa 3: Interceptors HTTP

**Files:**
- Create: `src/app/core/http/auth.interceptor.ts`, `src/app/core/http/sessao-expirada.interceptor.ts`
- Modify: `src/app/app.config.ts` (`provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessaoExpiradaInterceptor]))`)
- Test: `src/app/core/http/auth.interceptor.spec.ts`, `sessao-expirada.interceptor.spec.ts`

**Interfaces:**
- Consumes: `SessionService.token()`, `SessionService.encerrar()`.
- Produces:
  - `authInterceptor: HttpInterceptorFn` — adiciona `Authorization: Bearer <token>` só quando há token e a URL começa com `environment.apiUrl`.
  - `sessaoExpiradaInterceptor: HttpInterceptorFn` — em `401` de URL que **não** começa com `${apiUrl}/auth/`: `encerrar()` e `router.navigateByUrl('/login')`; repassa o erro.

- [ ] **Passo 1: Escrever os specs**: `anexaBearerNaApi`; `naoAnexaSemToken`; `naoAnexaEmUrlExterna` (`https://outra.com`); `401EmRotaAutenticadaEncerraERedireciona`; `401NoLoginNaoEncerra`; `403NaoEncerra`.
- [ ] **Passo 2: Rodar e ver falhar.**
- [ ] **Passo 3: Implementar e registrar no `app.config.ts`.**
- [ ] **Passo 4: Rodar e ver passar.**
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): interceptors de token e sessão expirada"`

---

### Tarefa 4: Componentes compartilhados

**Files:**
- Move/rename:
  - `components/primeiro-input/*` → `shared/ui/campo/campo.component.*` (classe `CampoComponent`, seletor `app-campo`)
  - `components/confirm-popup/*` → `shared/ui/dialogo-confirmacao/dialogo-confirmacao.component.*` (`DialogoConfirmacaoComponent`, `app-dialogo-confirmacao`)
  - `components/default-login-layout/*` → `shared/ui/layout-auth/layout-auth.component.*` (`LayoutAuthComponent`, `app-layout-auth`)
  - `components/base-page/*` → `shared/ui/layout-app/layout-app.component.*` (`LayoutAppComponent`, `app-layout-app`)
  - `validators/cpf.validator.ts` → `shared/validators/cpf.validator.ts`; `utils/email.util.ts` → `shared/utils/email.util.ts`
- Test: specs movidos junto, mais `layout-app.component.spec.ts` atualizado

**Interfaces:**
- Consumes: `SessionService.usuario`, `SessionService.encerrar`, `ROTULO_PERFIL`.
- Produces:
  - Todos com `input()`/`output()` em vez de `@Input`/`@Output`, OnPush, sem `CommonModule` quando o control flow nativo bastar.
  - `LayoutAppComponent`: inputs `heading` e `title` (mesmos defaults de hoje), `navItems` com o mesmo default; nome e perfil vêm do `SessionService` (inputs `userName`/`role` removidos); `confirmarSaida()` chama `encerrar()` e navega para `/login`.
  - `CampoComponent`: mesma API de inputs de hoje (`type`, `placeholder`, `label`, `inputName`, `controlName`, `mask`, `formGroup`) e mesmo `ControlValueAccessor`.

- [ ] **Passo 1: Atualizar/escrever os specs**: `layoutAppMostraNomeEPerfilDaSessao` (sessão com `PROFESSOR` → texto contém `Professor`); `sairEncerraSessaoENavega`; specs movidos dos outros três continuam passando.
- [ ] **Passo 2: Rodar e ver falhar.**
- [ ] **Passo 3: Mover e adaptar** (atualizar seletores nos templates que os usam).
- [ ] **Passo 4: Rodar e ver passar; `npm run build` sem erros.**
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): componentes compartilhados em shared/ui"`

---

### Tarefa 5: Telas de autenticação

**Files:**
- Move/rewrite para `src/app/features/auth/`: `login/`, `cadastro/`, `esqueci-senha/` (de `pages/esquecisenha`), `reenviar-verificacao/` (de `pages/verificaremail`), `verificar/`, `redefinir-senha/` (de `pages/resetar`) — cada um `.ts/.html/.scss/.spec.ts`
- Delete: `services/login/`, `services/alerta.service.ts`, `types/`

**Interfaces:**
- Consumes: `AuthService`, `Notificador`, `codigoDeErro`, `CampoComponent`, `LayoutAuthComponent`.
- Produces (comportamento):
  - Login: sucesso → `/dashboard`. `codigoDeErro == 'ERR003'` → `notificador.aviso(detail)` e navega para `/verificaremail` com `queryParams: { email }`. Outros erros → `erroDaApi`.
  - Cadastro: sucesso → `notificador.sucesso('Cadastro realizado! Verifique seu e-mail para ativar a conta.')` e `/login`.
  - Reenviar verificação: preenche o e-mail a partir de `?email=`; sucesso → `sucesso('Se o e-mail estiver cadastrado, você receberá um novo link.')` e `/login`.
  - Esqueci a senha: sucesso → `sucesso('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.')` e `/login`.
  - Verificar: lê `token` da query; sem token → estado `erro` com `'Link inválido ou expirado.'`, sem chamada; sucesso → estado `sucesso` com `'E-mail verificado com sucesso!'`; erro → estado `erro` com `mensagemDeErro`.
  - Redefinir senha: lê só `token` (sem `email`); sem token → mesma mensagem de link inválido e botão desabilitado; sucesso → `sucesso('Senha redefinida com sucesso!')` e `/login`.
  - Estado do componente em signals; formulários reativos mantidos.

- [ ] **Passo 1: Escrever os specs** (um por tela, `AuthService` e `Notificador` como spies):
  - `loginComSucessoNavegaParaDashboard`; `loginComERR003AvisaENavegaParaReenvioComEmail`.
  - `cadastroEnviaCpfSemMascaraEEmailNormalizado` (`'123.456.789-09'` → `'12345678909'`; `' Ana@X.com '` → `'ana@x.com'`).
  - `reenvioPreencheEmailDaQuery`.
  - `verificarSemTokenNaoChamaApi`; `verificarComTokenChamaApiEMostraSucesso`.
  - `redefinirSemTokenNaoChamaApi`; `redefinirEnviaSoTokenENovaSenha`.
- [ ] **Passo 2: Rodar e ver falhar.**
- [ ] **Passo 3: Implementar e apagar os arquivos antigos.**
- [ ] **Passo 4: Rodar e ver passar.**
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): telas de autenticação no novo contrato"`

---

### Tarefa 6: Área logada e rotas

**Files:**
- Move para `src/app/features/`: `pages/dashboard` → `inicio/`, `pages/calendario` → `aulas/`, `pages/financeiro` → `financeiro/`, `pages/configuracoes` → `perfil/` (classes `InicioComponent`, `AulasComponent`, `FinanceiroComponent`, `PerfilComponent`)
- Create: `src/app/features/perfil/perfil.service.ts`
- Modify: `src/app/app.routes.ts`, `features/perfil/perfil.component.html` (campo "Senha atual")
- Delete: `pages/home/` (sem rota), pasta `pages/`, `components/`

**Interfaces:**
- Consumes: `SessionService`, `Notificador`, `LayoutAppComponent`, `DialogoConfirmacaoComponent`.
- Produces:
  - `PerfilService.alterarSenha(senhaAtual: string, novaSenha: string): Observable<void>` → `PUT ${apiUrl}/alunos/me/senha`.
  - `PerfilComponent`: e-mail e nome vindos do `SessionService`; salvar nome chama `session.atualizarNome` (continua só local); troca de senha exige senha atual, nova (mín. 6) e confirmação; confirmar no diálogo chama `alterarSenha`; erro → `erroDaApi`.
  - Telas `inicio`, `aulas`, `financeiro`: mesmo conteúdo fictício de hoje, só com signals/OnPush e `LayoutAppComponent`.
  - Rotas: todas com `loadComponent`; `authGuard` em `dashboard`, `calendario`, `financeiro`, `configuracoes`; `verificar` e `resetar` públicas; rota `**` → `''`.

- [ ] **Passo 1: Escrever os specs**: `perfilEnviaSenhaAtualENova`; `perfilBloqueiaSenhaCurtaOuDiferente` (não chama o serviço); `perfilServicePutEmAlunosMeSenha`; `rotasVerificarEResetarSaoPublicas` (inspeciona `routes`: sem `canActivate`); specs de `inicio`/`aulas`/`financeiro` movidos passando (asserção `.base-page-shell` atualizada se a classe do layout mudar).
- [ ] **Passo 2: Rodar e ver falhar.**
- [ ] **Passo 3: Implementar e apagar o que ficou sem uso.**
- [ ] **Passo 4: Rodar e ver passar; `npm run build` sem erros.**
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): área logada em features e rotas lazy"`

---

### Tarefa 7: Zoneless e documentação

**Files:**
- Modify: `src/app/app.config.ts` (remover `provideZoneChangeDetection()`), `angular.json` (remover `zone.js` dos `polyfills` de build e `zone.js`/`zone.js/testing` dos de teste), `package.json`/`package-lock.json` (`npm uninstall zone.js`)
- Modify: `CLAUDE.md` (estrutura `core`/`features`/`shared`, sessão, interceptors, zoneless), `CHANGELOG.md` (`[Não lançado]`)

- [ ] **Passo 1: Verificar que nenhum componente ficou sem OnPush** — `grep -rL "ChangeDetectionStrategy.OnPush" $(grep -rl "@Component" src/app --include=*.ts | grep -v spec)` → vazio; `grep -rn "sessionStorage" src/app --include=*.ts | grep -v "core/auth"` → vazio (exceto specs).
- [ ] **Passo 2: Remover zone.js** conforme os arquivos acima.
- [ ] **Passo 3: Rodar a suíte completa e o build** — testes todos passando; `npm run build` sem erros; `npm ci` limpo funciona.
- [ ] **Passo 4: Teste manual** com a API da Tarefa 8 do plano da API rodando localmente (`API_URL=http://localhost:8080 npm start`): login, aviso de conta não verificada, logout limpa sessão, troca de senha com senha atual, link `/resetar?token=` e `/verificar?token=` abertos deslogado.
- [ ] **Passo 5: Commit** — `git commit -m "refactor(front): zoneless e documentação da nova estrutura"`

---

## Entrega

Depois dos dois planos concluídos: merge de `refactor/solid` em `dev` nos dois repositórios, depois `dev` → `master`, publicando a API (Render) e em seguida o front (Vercel, `vercel deploy --prod` a partir de clone limpo). Requer autorização explícita do dono do produto.
