# Changelog

Todas as mudanças relevantes do frontend Almeida JJ ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/). Cada versão corresponde a uma tag `vX.Y.Z` no git.

**Como usar:** anote as mudanças em `[Não lançado]` conforme forem feitas. Ao lançar, rode `./set-version.sh X.Y.Z`. O script transforma essa seção na nova versão e atualiza o `package.json` e o `package-lock.json`.

## [Não lançado]

### Alterado
- `set-version.sh` passa a indicar o remote `origin` nos próximos passos (o remote duplicado `master` foi removido).

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
