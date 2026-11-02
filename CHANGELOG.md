# Changelog

Todas as mudanças relevantes do frontend Almeida JJ ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/). Cada versão corresponde a uma tag `vX.Y.Z` no git.

**Como usar:** anote as mudanças em `[Não lançado]` conforme forem feitas. Ao lançar, rode `./set-version.sh X.Y.Z`. O script transforma essa seção na nova versão e atualiza o `package.json` e o `package-lock.json`.

## [Não lançado]

### Alterado
- Código reorganizado em `core` (sessão, autenticação, HTTP, notificação), `features` (uma pasta por área) e `shared` (componentes, validadores, utilitários).
- Change detection **zoneless**: `zone.js` removido; estado com signals e todos os componentes `OnPush`. Rotas com carregamento lazy. Bundle inicial de 573 kB para 472 kB.
- Sessão centralizada no `SessionService` (chaves `ajj.token` e `ajj.usuario`); sessões antigas exigem novo login.
- Token anexado automaticamente por interceptor; 401 em rota autenticada encerra a sessão e volta ao login.
- Consome o novo contrato da API (`/auth/**`, `/alunos/me/senha`) e as mensagens de erro em `ProblemDetail`.
- Conta não verificada no login leva direto ao reenvio da verificação, com o e-mail preenchido.
- Troca de senha em Configurações exige a senha atual.
- E-mail com espaços nas pontas é aceito nos formulários (comum no autocompletar do celular).

### Corrigido
- Sair da conta agora limpa a sessão.
- Cadastro não grava mais sessão inválida.
- Links de verificação e redefinição abrem sem exigir login; sem token, mostram "Link inválido ou expirado."
- Salvar só o nome em Configurações agora atualiza o nome.
- Perfil exibido como Aluno/Professor a partir do `perfil` da API.

### Removido
- `LoginService`, `AlertaService`, `AuthGuard` de classe e a tela `home` sem rota.

## [0.1.0] - 2026-11-01

### Alterado
- Angular 19 → **22.2** (passando por 20 e 21), TypeScript 6, ngx-mask 22, zone.js 0.16.
- Mantida a detecção de mudanças via zone.js: `provideZoneChangeDetection()` no `app.config.ts` (o Angular 21+ é zoneless por padrão) e `ChangeDetectionStrategy.Eager` nos componentes (o 22 usa OnPush por padrão).
- `color-scheme: dark` fixo no `:root` (`styles.scss`). Antes vinha do tema do PrimeNG e só valia com o sistema em modo escuro — em modo claro o texto saía preto.
- `.gitignore` passa a ignorar `.vercel` e `.env*`.
- `set-version.sh` passa a indicar o remote `origin` nos próximos passos (o remote duplicado `master` foi removido).

### Removido
- PrimeNG, `@primeng/themes`, PrimeIcons e `@angular/animations`: não eram usados, e o PrimeNG 22 passou a exigir license key comercial. Bundle inicial de 672 kB para 564 kB.

### Corrigido
- Specs do Karma quebrados (providers ausentes e asserções desatualizadas): 21/21 passando.
- `primeng` e `@primeng/themes` atualizados para 19.1.4. A 19.1.0 exigia exatamente `@angular/cdk@19.2.3`, o que quebrava o `npm install` na Vercel desde 23/08.

## [0.0.1] - 2026-11-01

Primeira versão marcada. Reúne todo o desenvolvimento até esta data.

### Adicionado
- Telas de login e cadastro (com validação e máscara de CPF), responsivas.
- Fluxo de verificação de conta: envio do e-mail (`/verificaremail`) e ativação pelo link (`/verificar?token=`).
- Fluxo de recuperação de senha: solicitação (`/esquecisenha`) e redefinição pelo link (`/resetar?token=`).
- Área logada com layout base e menu: visão geral, treinos, financeiro e configurações.
- Troca de senha e edição do nome na tela de configurações.
- Dados do usuário (nome, e-mail, perfil) salvos no `sessionStorage` e exibidos nas páginas.
- `AuthGuard` protegendo as rotas internas.
- Alertas padronizados com SweetAlert2 (`AlertaService`), incluindo as mensagens de erro da API.
- URL da API definida pela variável `API_URL` (`scripts/set-environment.mjs`).
- Documentação: `README.md` e `CLAUDE.md`.
- Script `set-version.sh` e este changelog.

### Corrigido
- O `user-id` salvo na sessão agora usa o campo `idAluno` retornado pela API (antes ficava `undefined`).
- O CPF é enviado sem máscara e o e-mail é normalizado antes de chamar a API.

### Problemas conhecidos
- Dashboard, treinos e financeiro ainda usam dados de exemplo.
- Não existe interceptor HTTP; o header de autenticação é montado manualmente em cada chamada.
- O Dependabot do GitHub apontou vulnerabilidades em dependências (ainda não analisadas).

[Não lançado]: https://github.com/CaioMarinss/almeida-jj-frontend/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/CaioMarinss/almeida-jj-frontend/releases/tag/v0.0.1
