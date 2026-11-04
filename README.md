# Almeida JJ — Frontend

Interface web do sistema de gestão da academia **Almeida JJ** (jiu-jitsu): login, cadastro, verificação de conta, recuperação e troca de senha, e o painel do aluno (visão geral, treinos, financeiro e configurações).

API: repositório `almeida-jj-api` (privado).

## Stack

- Angular 22 (standalone components) · TypeScript · SCSS
- ngx-mask · SweetAlert2
- Karma + Jasmine (testes)

## Pré-requisitos

- Node.js 20+ e npm
- A API rodando (veja o README da API)

## Como rodar

A URL da API é obrigatória e vem da variável `API_URL`:

```bash
npm install
export API_URL="http://localhost:8080"
npm start
```

Acesse `http://localhost:4200`.

> Os scripts `start`, `build` e `test` executam antes `scripts/set-environment.mjs`, que gera `src/environments/environment.ts` a partir de `API_URL`. Sem a variável, o comando falha. Evite commitar esse arquivo com a URL de produção.

> A API precisa liberar a origem do front no CORS (`URL_FRONTEND=http://localhost:4200` no `.env` da API).

### Outros comandos

```bash
npm run build   # build de produção em dist/almeida-jj
npm test        # testes unitários
npm run e2e     # testes ponta a ponta (veja abaixo)
```

## Testes ponta a ponta (e2e)

Testam o sistema inteiro como um usuário: navegador real (Playwright) → front → API → Postgres, com os e-mails capturados pelo Mailpit. Precisam do Docker e do repositório da API em `../almeidaPresenca`. Rodam com `npm run e2e` e, no GitHub Actions, a cada push ou PR para `dev`.

Tudo sobre a suíte (como rodar, como funciona, lista de cenários, CI e a ordem de subida API → front) está em [`e2e/README.md`](e2e/README.md).

## Telas

| Rota | Tela | Acesso |
|---|---|---|
| `/login` | Login | público |
| `/cadastro` | Cadastro de aluno | público |
| `/verificaremail` | Enviar (ou reenviar) o e-mail de verificação da conta | público |
| `/esquecisenha` | Solicitar recuperação de senha | público |
| `/verificar?token=` | Ativação da conta (link do e-mail) | token na URL |
| `/resetar?token=` | Definir nova senha (link do e-mail) | token na URL |
| `/dashboard` | Visão geral | logado |
| `/calendario` | Treinos | logado |
| `/financeiro` | Financeiro | logado |
| `/configuracoes` | Perfil e troca de senha | logado |

> Dashboard, treinos e financeiro ainda usam dados de exemplo — os endpoints correspondentes estão em desenvolvimento na API.

## Autenticação

Após login ou cadastro, o token JWT e os dados do usuário ficam no `sessionStorage` (são apagados ao fechar a aba). O `AuthGuard` bloqueia as rotas internas sem token e redireciona para `/login`.

## Estrutura

```
src/
├── app/
│   ├── pages/        # uma pasta por rota
│   ├── components/   # base-page (layout logado), default-login-layout, primeiro-input, confirm-popup
│   ├── services/     # LoginService, AuthGuard, AlertaService (alertas SweetAlert2)
│   ├── types/        # tipos de resposta da API
│   ├── validators/   # validador de CPF
│   └── utils/
├── styles/variables.scss   # cores do tema (amarelo #F2CC0F sobre fundo escuro)
└── environments/           # gerado a partir de API_URL
scripts/set-environment.mjs
```
