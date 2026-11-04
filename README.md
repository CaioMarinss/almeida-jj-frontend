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

Testam o sistema inteiro como um usuário: navegador real (Playwright) → front → API → Postgres, com os e-mails capturados pelo [Mailpit](https://mailpit.axllent.org/). Não rodam no `npm test`, mas rodam no GitHub Actions a cada push ou PR para `dev` (veja abaixo).

**Pré-requisitos:** Docker rodando; o repositório da API em `../almeidaPresenca` (ou informe `ALMEIDA_API_DIR=/caminho/da/api`); portas 4300, 18080 e 18025 livres. O e2e testa a **branch que estiver aberta no repositório da API**.

```bash
npm run e2e                                      # sobe tudo, roda e derruba no final
npx playwright test e2e/tests/cadastro.spec.ts   # um arquivo
npx playwright test -g "senha forte"             # testes cujo nome contém o texto
npx playwright test --project=desktop            # só desktop (o outro projeto é "celular")
npx playwright test --ui                         # modo interativo, passo a passo
npx playwright test --headed                     # mostra o navegador
npm run e2e:relatorio                            # relatório HTML da última execução (prints e trace das falhas)
E2E_MANTER_AMBIENTE=1 npm run e2e                # mantém os containers no fim; e-mails em http://localhost:18025
docker compose -f e2e/docker-compose.yml down -v # desliga o ambiente mantido
```

Como funciona:

- `e2e/docker-compose.yml` sobe Postgres (em memória, com `init.sql` e `populate.sql` da API), Mailpit e a API (build do repositório da API). A API envia e-mails por SMTP para o Mailpit.
- `playwright.config.ts` sobe o front com `ng serve --configuration e2e` na porta 4300. Essa configuração troca o `environment.ts` por `src/environments/environment.e2e.ts` (API em `http://localhost:18080`), sem mexer no seu ambiente local.
- Cada teste cria seus próprios dados (e-mail e CPF aleatórios); não depende de ordem nem de dados prévios. Os links de verificação e redefinição são lidos dos e-mails pela API do Mailpit (`e2e/suporte/mailpit.ts`).
- `e2e/tests/` tem os cenários; `e2e/suporte/` tem os helpers (subir/derrubar ambiente, contas, telas, dados).

### No GitHub (Actions)

`.github/workflows/e2e.yml` roda o e2e a cada push ou PR para `dev`, usando a branch `dev` da API. O push não é bloqueado: se algum teste falhar, o commit fica com ❌, o GitHub avisa por e-mail e o relatório HTML fica para baixar em **Actions → execução → Artifacts → `relatorio-e2e`**. Também dá para rodar à mão em **Actions → e2e → Run workflow**. A API é privada, então o workflow baixa ela com a deploy key guardada no secret `API_DEPLOY_KEY`. O repositório da API tem o mesmo workflow, que usa a `dev` deste repositório.

**Ordem de subida:** a API sempre sobe antes. Quando uma mudança mexe nos dois repositórios, faça o merge e o push na `dev` da API primeiro, espere o e2e dela ficar verde e só então faça o do front. Cada workflow testa contra a `dev` do outro repositório, então se o front subir antes, o e2e dele roda contra uma API sem a mudança e falha.


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
