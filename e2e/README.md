# Testes ponta a ponta (e2e)

Testam o sistema inteiro como um usuário: navegador real (Playwright) → front → API → Postgres. Os e-mails ficam presos no [Mailpit](https://mailpit.axllent.org/) e os testes leem deles os links de verificação e de redefinição.

Não rodam no `npm test`. No GitHub, rodam a cada push ou PR para `dev` nos dois repositórios (veja [No GitHub](#no-github-actions)).

## Pré-requisitos

- Docker rodando.
- Repositório da API em `../almeidaPresenca` (ou informe `ALMEIDA_API_DIR=/caminho/da/api`). O e2e usa a **branch que estiver aberta** no repositório da API.
- Portas livres: 4300 (front), 18080 (API) e 18025 (Mailpit).
- `npm install` feito. Na primeira vez, instale o navegador com `npx playwright install chromium`.

## Como rodar

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

## Como funciona

| Peça | Onde | O que faz |
|---|---|---|
| Postgres | `docker-compose.yml` | Banco em memória (tmpfs), criado com `init.sql` e `populate.sql` da API. Some ao derrubar. |
| Mailpit | `docker-compose.yml` | Servidor SMTP falso. A API envia os e-mails para ele, e os testes leem pela API dele (porta 18025). |
| API | `docker-compose.yml` | Build do repositório da API, na porta 18080, com segredo de teste e e-mail por SMTP no Mailpit. |
| Front | `../playwright.config.ts` | `ng serve --configuration e2e` na porta 4300. Essa configuração troca o `environment.ts` por `src/environments/environment.e2e.ts`, que aponta para a API em 18080. |

- `suporte/subir-ambiente.ts` e `suporte/derrubar-ambiente.ts` sobem e derrubam os containers antes e depois da suíte. Com `E2E_SEM_DOCKER=1`, nenhum container é gerenciado e você usa um ambiente que já esteja no ar.
- Cada teste cria os próprios dados (e-mail e CPF aleatórios), então eles não dependem de ordem nem de dados prévios e podem rodar em paralelo.
- Projetos: `desktop` (Desktop Chrome) e `celular` (Pixel 7). Todos os testes rodam nos dois, menos os de API pura, que rodam só no desktop.
- `workers: 2`: com mais navegadores em paralelo, a máquina (WSL ou o runner do GitHub) fica sobrecarregada e as navegações estouram o tempo.
- No modo celular, o Ionic cria uma cópia escondida (`.cloned-input`) do campo com foco. Por isso `suporte/telas.ts` ignora essa cópia ao buscar campos.

### Estrutura

```
e2e/
├── docker-compose.yml   Postgres + Mailpit + API
├── tests/               cenários (um arquivo por fluxo)
└── suporte/
    ├── ambiente.ts      docker compose e espera de serviços
    ├── contas.ts        cria conta já verificada pela API
    ├── dados.ts         senhas de teste, e-mail e CPF válidos aleatórios
    ├── mailpit.ts       busca e-mail e extrai o link
    └── telas.ts         helpers de tela (campo, botão, toast, alerta, login)
```

## Cenários

São 22 testes, que viram 34 execuções: os 22 rodam no desktop e 12 rodam de novo no celular.

### Cadastro (`tests/cadastro.spec.ts`), desktop e celular

| Cenário | O que verifica |
|---|---|
| A lista de regras acompanha a digitação | As 6 regras de senha aparecem e vão sendo marcadas conforme se digita, incluindo a regra "sem espaços". |
| Não envia a senha fraca (6 casos) | Com `Curta@1`, `semmaiuscula@1`, `SEMMINUSCULA@1`, `SemNumero@`, `SemEspecial1` e `Com Espaco@1`, o form mostra o erro e **nenhuma chamada** sai para a API. |
| Não envia quando a confirmação é diferente | Mostra "As senhas não coincidem." e não chama a API. |
| Com senha forte cria a conta, verifica pelo e-mail e entra | Fluxo completo: cadastro, e-mail de verificação no Mailpit, link de verificação e login até `/app/inicio`. |

### Redefinição de senha (`tests/redefinir-senha.spec.ts`), desktop e celular

| Cenário | O que verifica |
|---|---|
| Exige senha forte, troca a senha e invalida o link usado | "Esqueci a senha", e-mail no Mailpit, tela de nova senha que recusa senha fraca sem chamar a API, troca com senha forte e login com a nova senha. Reusar o mesmo link mostra "Link inválido ou expirado." |
| A senha antiga para de funcionar | Depois da redefinição, o login com a senha antiga é recusado. |

### Troca de senha no perfil (`tests/perfil.spec.ts`), desktop e celular

| Cenário | O que verifica |
|---|---|
| Bloqueia senha fraca, mostra o erro da API e troca com senha forte | Senha fraca não chama a API. Senha atual errada mostra "Senha atual incorreta.". Com os dados certos, troca a senha, desloga e entra com a nova. |

### API recusa senha fraca sem passar pelo front (`tests/api-regras-senha.spec.ts`), só desktop

Chamam a API direto, sem abrir tela. Garantem que a regra vale mesmo para quem pula o front (Postman, curl). São pulados no celular porque repetiriam as mesmas chamadas.

| Cenário | O que verifica |
|---|---|
| Cadastro com senha fraca (7 casos) | Com `Curta@1`, `semmaiuscula@1`, `SEMMINUSCULA@1`, `SemNumero@`, `SemEspecial1`, `Com Espaco@1` e `abc`, a API responde 400 e diz no campo `senha` o que faltou. |
| Redefinição com senha fraca | A API responde 400 antes mesmo de validar o token. |
| Troca de senha logado | `PUT /alunos/me/senha` recusa senha fraca (400 com o motivo) e aceita senha forte (204). |
| Login de conta antiga | Contas criadas antes das regras, com senha fora do padrão, continuam conseguindo fazer login (as regras não são aplicadas no login). |

## No GitHub (Actions)

`.github/workflows/e2e.yml` roda a suíte a cada push ou PR para `dev`, usando a branch `dev` da API. Também dá para rodar à mão em **Actions → e2e → Run workflow**. O repositório da API tem o mesmo workflow, que usa a `dev` deste repositório.

- O push **não é bloqueado**. Se algum teste falhar, o commit fica com ❌, o GitHub avisa por e-mail e o relatório HTML fica para baixar em **Actions → execução → Artifacts → `relatorio-e2e`**. Quando falha, o log da API também aparece na execução.
- O workflow **não roda** quando o push ou PR só muda arquivos que não afetam o e2e: `*.md`, `docs/`, arquivos de IA (`.claude/`, `.agents/`, `.superpowers/`) e testes unitários (`src/**/*.spec.ts`). Basta um arquivo fora dessa lista para ele rodar. Mudanças em `e2e/` sempre disparam o workflow. A lista fica em `paths-ignore`, no `.github/workflows/e2e.yml`.
- No CI, um teste que falha roda de novo uma vez. Se passar na segunda tentativa, ele aparece como "flaky".
- A API é privada, então o workflow baixa ela com a deploy key (só leitura) guardada no secret `API_DEPLOY_KEY`.

**Ordem de subida:** a API sempre sobe antes. Quando uma mudança mexe nos dois repositórios, faça o merge e o push na `dev` da API primeiro, espere o e2e dela ficar verde e só então faça o do front. Cada workflow testa contra a `dev` do outro repositório, então se o front subir antes, o e2e dele roda contra uma API sem a mudança e falha.

## Escrevendo um teste novo

- Crie o arquivo em `tests/` e use os helpers de `suporte/` (`criarContaAtiva`, `entrar`, `preencher`, `botao`, `linkDoEmail`...).
- Gere os dados com `emailUnico()` e `cpfValido()`. Nunca dependa de dados criados por outro teste.
- Busque campos por `campo(page, id)`, que usa o `id` do `ion-input`. Para botões, use `botao(page, 'Texto')`.
- Para garantir que o front não chamou a API, use `contarChamadas(page, 'POST', '/caminho')`.
- Teste que só chama a API não precisa rodar no celular: `test.skip(({ isMobile }) => isMobile, 'não depende da tela')`.
