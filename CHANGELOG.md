# Changelog

Todas as mudanças relevantes do frontend Almeida JJ ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/). Cada versão corresponde a uma tag `vX.Y.Z` no git.

**Como usar:** anote as mudanças em `[Não lançado]` conforme forem feitas. Ao lançar, rode `./set-version.sh X.Y.Z`. O script transforma essa seção na nova versão e atualiza o `package.json` e o `package-lock.json`.

## [Não lançado]

### Adicionado
- Novo visual "esportivo" (fundo escuro, amarelo de destaque, Oswald e Barlow) com componentes Ionic 9 e ícones Lucide em todas as telas.
- Navegação de app na área logada (`/app/*`): abas embaixo no celular e menu lateral no computador (a partir de 992 px).
- Tela de Presença (aba própria) e componentes base: botão com estado de carregando, estado vazio e faixa com graus.
- App instalável (PWA): manifest, ícones e service worker em produção. Capacitor configurado para gerar o app Android/iOS depois.
- Confirmação antes de sair da conta e antes de trocar a senha; dois toques rápidos abrem um único alerta.
- Aviso de versão nova do app (PWA) com opção de atualizar na hora; o app procura atualização quando volta a ficar visível.
- Quem já está logado e abre `/` ou `/login` vai direto para o Início.
- Sessão com token expirado é encerrada ao abrir o app ou trocar de tela, com aviso "Sua sessão expirou." quando a API responde 401.
- Com "reduzir movimento" ativo no sistema, as animações do Ionic ficam desligadas.

### Alterado
- Início, Aulas, Presença e Financeiro mostram estado vazio ("Em breve…") no lugar dos dados fictícios.
- Configurações virou a aba Perfil (cartão com nome, e-mail e Aluno/Professor; troca de senha encerra a sessão). A edição de nome saiu até a API ter onde salvar.
- Links antigos continuam funcionando: `/dashboard`, `/calendario`, `/financeiro` e `/configuracoes` redirecionam para a aba correspondente.
- Notificações viraram toasts e alertas do Ionic.
- Campo de CPF formata enquanto o usuário digita e abre o teclado numérico no celular.
- Código reorganizado em `core` (sessão, autenticação, HTTP, notificação), `features` (uma pasta por área) e `shared` (componentes, validadores, utilitários).
- Change detection **zoneless**: `zone.js` removido; estado com signals e todos os componentes `OnPush`. Rotas com carregamento lazy. Bundle inicial de 573 kB para 472 kB.
- Sessão centralizada no `SessionService` (chaves `ajj.token` e `ajj.usuario`); sessões antigas exigem novo login.
- Token anexado automaticamente por interceptor; 401 em rota autenticada encerra a sessão e volta ao login.
- Consome o novo contrato da API (`/auth/**`, `/alunos/me/senha`) e as mensagens de erro em `ProblemDetail`.
- Conta não verificada no login leva direto ao reenvio da verificação, com o e-mail preenchido.
- Troca de senha em Configurações exige a senha atual.
- Botões dos formulários de autenticação ficam bloqueados enquanto a requisição está em andamento (evita cadastro duplo).
- E-mail com espaços nas pontas é aceito nos formulários (comum no autocompletar do celular).

### Corrigido
- Sair da conta agora limpa a sessão.
- Cadastro não grava mais sessão inválida.
- Links de verificação e redefinição abrem sem exigir login; sem token, mostram "Link inválido ou expirado."
- Favicon voltou a carregar (o arquivo é servido em `/assets/`).
- Rótulos das abas com contraste suficiente (WCAG AA).
- Token só é anexado a URLs da API (`<API_URL>` ou `<API_URL>/...`), não a domínios que apenas começam com o mesmo texto.
- Perfil exibido como Aluno/Professor a partir do `perfil` da API.

### Removido
- `LoginService`, `AlertaService`, `AuthGuard` de classe e a tela `home` sem rota.
- `SessionService.atualizarNome` e o bloco "Nome" do Perfil (o nome só mudava localmente e voltava ao entrar de novo).
- SweetAlert2 e ngx-mask (substituídos pelo Ionic e por `formatarCpf`), foto de perfil, `layout-app`, `dialogo-confirmacao` e as fontes El Messiri, Host Grotesk, Poppins, Roboto e Material Icons.

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
