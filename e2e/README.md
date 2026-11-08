# Testes ponta a ponta (e2e)

Testam o sistema inteiro como um usuário: navegador real (Playwright) → front → API → Postgres. Os e-mails ficam presos no [Mailpit](https://mailpit.axllent.org/) e os testes leem deles os links de verificação e de redefinição.

Não rodam no `npm test`. No GitHub, rodam a cada push ou PR para `dev` nos dois repositórios (veja [No GitHub](#no-github-actions)).

## Pré-requisitos

- Docker rodando.
- Repositório da API em `../almeidaPresenca` (ou informe `ALMEIDA_API_DIR=/caminho/da/api`). O e2e usa a **branch que estiver aberta** no repositório da API, inclusive o ambiente: o `docker-compose.yml` (banco, Mailpit e API) mora na API, em `almeidaPresenca/e2e/docker-compose.yml`, para o banco de teste sempre combinar com a branch dela.
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
docker compose -f ../almeidaPresenca/e2e/docker-compose.yml down -v # desliga o ambiente mantido
```

## Como funciona

| Peça | Onde | O que faz |
|---|---|---|
| Postgres | `almeidaPresenca/e2e/docker-compose.yml` | Banco em memória (tmpfs), criado com `init.sql` e `populate.sql` da API. Some ao derrubar. |
| Mailpit | `almeidaPresenca/e2e/docker-compose.yml` | Servidor SMTP falso. A API envia os e-mails para ele, e os testes leem pela API dele (porta 18025). |
| API | `almeidaPresenca/e2e/docker-compose.yml` | Build do repositório da API, na porta 18080, com segredo de teste e e-mail por SMTP no Mailpit. |
| Front | `../playwright.config.ts` | `ng serve --configuration e2e` na porta 4300. Essa configuração troca o `environment.ts` por `src/environments/environment.e2e.ts`, que aponta para a API em 18080. |

- `suporte/subir-ambiente.ts` e `suporte/derrubar-ambiente.ts` sobem e derrubam os containers antes e depois da suíte. Com `E2E_SEM_DOCKER=1`, nenhum container é gerenciado e você usa um ambiente que já esteja no ar.
- Cada teste cria os próprios dados (e-mail e CPF aleatórios), então eles não dependem de ordem nem de dados prévios e podem rodar em paralelo.
- Projetos: `desktop` (Desktop Chrome) e `celular` (Pixel 7). Todos os testes rodam nos dois, menos os de API pura, que rodam só no desktop.
- `workers: 2`: com mais navegadores em paralelo, a máquina (WSL ou o runner do GitHub) fica sobrecarregada e as navegações estouram o tempo.
- No modo celular, o Ionic cria uma cópia escondida (`.cloned-input`) do campo com foco. Por isso `suporte/telas.ts` ignora essa cópia ao buscar campos.

### Estrutura

```
e2e/
├── tests/               cenários (um arquivo por fluxo)
└── suporte/
    ├── ambiente.ts      docker compose e espera de serviços
    ├── banco.ts         executarSql: roda SQL no Postgres do ambiente (ex.: criar dono)
    ├── contas.ts        cria conta verificada (criarContaAtiva), dono (criarDono), nome único (nomear), token e id pela API
    ├── dados.ts         senhas de teste, e-mail e CPF válidos aleatórios
    ├── mailpit.ts       busca e-mail e extrai o link
    └── telas.ts         helpers de tela (campo, botão, toast, alerta, login)
```

## Cenários

São 53 testes, que viram 83 execuções: os 53 rodam no desktop e 30 rodam de novo no celular.

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
| Perfil fica logo acima de Sair no menu lateral (só desktop) | Os dois últimos itens do menu são Perfil e Sair; clicar em Perfil abre `/app/perfil`. |

### API recusa senha fraca sem passar pelo front (`tests/api-regras-senha.spec.ts`), só desktop

Chamam a API direto, sem abrir tela. Garantem que a regra vale mesmo para quem pula o front (Postman, curl). São pulados no celular porque repetiriam as mesmas chamadas.

| Cenário | O que verifica |
|---|---|
| Cadastro com senha fraca (7 casos) | Com `Curta@1`, `semmaiuscula@1`, `SEMMINUSCULA@1`, `SemNumero@`, `SemEspecial1`, `Com Espaco@1` e `abc`, a API responde 400 e diz no campo `senha` o que faltou. |
| Redefinição com senha fraca | A API responde 400 antes mesmo de validar o token. |
| Troca de senha logado | `PUT /alunos/me/senha` recusa senha fraca (400 com o motivo) e aceita senha forte (204). |
| Login de conta antiga | Contas criadas antes das regras, com senha fora do padrão, continuam conseguindo fazer login (as regras não são aplicadas no login). |

### Cargos (`tests/cargos.spec.ts`)

A conta de dono é criada pelo próprio teste (`criarDono`: cadastro pela API + `UPDATE ... CARGO = 'D'` no banco do ambiente).

| Cenário | Onde roda | O que verifica |
|---|---|---|
| O dono vê o cargo e chega em Professores pelo perfil | desktop e celular | Chip "Dono" no Perfil; "Gerenciar professores" abre `/app/professores`, e a busca pelo nome acha o dono. |
| O dono promove e rebaixa um aluno | desktop e celular | Busca pelo nome, toque na linha abre o painel; "Tornar professor" com confirmação e toast; o aluno entra e vê "Professor". "Remover professor" volta para "Aluno", e o aluno confirma ao entrar. |
| Aluno e professor não acessam Professores | desktop e celular | Nenhum dos dois vê "Gerenciar professores", e abrir `/app/professores` leva para `/app/inicio`. |
| O menu lateral do dono tem Professores | só desktop | O item do menu abre a tela. |
| API: professor e aluno não alteram cargo | só desktop | `PUT /alunos/{id}/perfil` responde 403 para os dois. |
| API: o cargo de outro dono não muda pelo app | só desktop | 422 com `codigo` `ERR010`. |
| API: ninguém vira dono pelo app | só desktop | `{"perfil":"DONO"}` responde 400. |

### Graduação (`tests/graduacao.spec.ts`)

Os alunos ganham um nome único (`UPDATE ... NOME` no banco) para a busca da tela achar só eles. A data da próxima graduação é única na academia, então os cenários que a mexem rodam só no desktop, em `test.describe.serial`, e cancelam a data no `finally`.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| O dono registra faixa e grau e o aluno acompanha a evolução | desktop e celular | Registro de Faixa Azul 1º grau pela tela; o aluno vê título e barra "Faixa Azul · 1 grau" no card do Início. Novo grau (2º) deixa a evolução com 2 itens. |
| Registro com data anterior à faixa atual | desktop e celular | Aviso "Data anterior à faixa atual: entra só no histórico.", histórico ganha item e a faixa atual (Azul, 2 graus) não muda. |
| Registro com data passada mais recente que a atual | desktop e celular | Sem aviso; a faixa registrada vira a atual. |
| Busca por nome e filtro por faixa | desktop e celular | Busca sem diferenciar maiúsculas, filtro Azul acha, Roxa não acha, "Sem graduação" acha quem não tem. |
| Aluno e professor não veem Graduação | desktop e celular | Sem item no menu nem "Gerenciar graduações"; `/app/graduacao` leva para `/app/inicio`. |
| O dono chega em Graduação pelo perfil | desktop e celular | "Gerenciar graduações" abre a tela. |
| O menu lateral do dono tem Graduação | só desktop | O item do menu abre a tela. |
| Conta desativada antes de salvar | só desktop | Desativa a conta com a modal aberta; salvar mostra o alerta "Aluno não encontrado" e a tela continua usável. |
| Agendar e cancelar a próxima graduação (botão "Alterar") | só desktop (serial) | Aluno vê "Próxima graduação: DD/MM"; ao cancelar, "Sem data definida para a próxima graduação". |
| Trocar a data agendada (botão "Alterar") | só desktop (serial) | A nova data substitui a anterior. |
| API: professor e aluno não registram nem agendam | só desktop | 403 em registrar, agendar, cancelar e listar alunos. |
| API: grau 5 na Faixa Azul | só desktop | 422 com `codigo` `ERR012`. |
| API: data futura no registro | só desktop | 400 com `codigo` `ERR013`. |

### Área do dono (`tests/area-dono.spec.ts`)

Contas com nome único (`nomear`), porque a lista é paginada em memória e contas de outros testes podem empurrar a sua para outra página: sempre busca pelo nome antes.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| O dono vê o card na Início | desktop e celular | Card "Área do dono" com atalhos que abrem Professores e Graduação. |
| Aluno e professor não veem o card | desktop e celular | O card não existe na Início deles. |
| Professores: busca sem acento | desktop e celular | "JOAO <ÚNICO>" acha "João <único>"; a linha mostra e-mail e cargo e o homônimo fica de fora. |
| Professores: filtro por cargo | desktop e celular | Chips Professores, Alunos e Todos (`aria-pressed`). |
| Professores: paginação | desktop e celular | 8 contas: "8 pessoas", 7 na página 1, "Página 1 de 2", Próxima e Anterior. |
| Professores: promover pelo painel | desktop e celular | Cancelar no painel não muda nada; "Tornar professor" confirma e atualiza o chip. |
| Graduação: busca sem acento e paginação | desktop e celular | "ANGELA ..." acha "Ângela ..."; 8 alunos: "8 alunos", 7 por página. |
| Graduação: remover registro antigo e o atual | desktop e celular | Mensagens de confirmação, toast "Registro removido.", faixa do painel e card do aluno voltam para a anterior; o último remove deixa "Sem graduação". |
| API: remoção de registro | só desktop | 403 para professor e aluno; 404 `ERR015` para registro de outro aluno ou já removido; dono remove (200, `atual` nulo). |
| API: lista de alunos da graduação | só desktop | `GET /graduacoes/alunos` devolve o array inteiro, sem paginação. |

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
