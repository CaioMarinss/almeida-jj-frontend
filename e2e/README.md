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
    ├── datas.ts         datas em São Paulo (hoje, somar dias, dia da semana de uma semana à frente)
    ├── contas.ts        cria conta verificada (criarContaAtiva), dono (criarDono), nome único (nomear), token e id pela API
    ├── dados.ts         senhas de teste, e-mail e CPF válidos aleatórios
    ├── mailpit.ts       busca e-mail e extrai o link
    └── telas.ts         helpers de tela (campo, botão, toast, alerta, login)
```

## Cenários

São 63 testes; a última rodada completa teve 102 execuções passando e 26 puladas (testes só de desktop no celular), 0 falhas.

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
| Painel do aluno mostra as presenças | desktop e celular | Presença da semana passada (SQL) aparece em `app-presencas-aluno` dentro do registro de graduação, como "contada". |
| Agendar e cancelar a próxima graduação (botão "Alterar") | só desktop (serial) | Preenche os mínimos (`#minimo-grau`, `#minimo-faixa`); a linha mostra "Mínimo: 10 grau · 20 faixa"; aluno vê "Próxima graduação: DD/MM"; ao cancelar, "Sem data definida para a próxima graduação". |
| Trocar a data agendada (botão "Alterar") | só desktop (serial) | A nova data (com os mínimos) substitui a anterior. |
| A aba Presença mostra X de Y | só desktop (serial) | Evento daqui a 10 dias com mínimo de grau 5 e 2 presenças da semana passada (SQL): título "2 de 5 presenças até a graduação de DD/MM", "Faltam 3", barra `aria-valuenow=2`, 2 itens "contada". |
| Antes da data o Graduou fica desabilitado | só desktop (serial) | "Ver aptos" lista o aluno com "2/2" e "Disponível em DD/MM" com o botão Graduou desabilitado; quem tem 1 de 2 mostra "faltam 1" e não tem o botão. |
| Mínimos, apto e Graduou | só desktop (serial) | Salvar fica desabilitado até os dois mínimos; evento para hoje; o aluno aparece em "Troca de grau" com "2/2"; Graduou abre a confirmação preenchida (Faixa Branca, 1º grau); depois do toast "<nome> graduou." o aluno mostra "faltam 2" sem o botão e a API tem a Faixa Branca 1 grau. |
| API: professor e aluno não registram nem agendam | só desktop | 403 em registrar, agendar, cancelar e listar alunos. |
| API: grau 5 na Faixa Azul | só desktop | 422 com `codigo` `ERR012`. |
| API: data futura no registro | só desktop | 400 com `codigo` `ERR013`. |

### Presença (`tests/presenca.spec.ts`)

Os cenários de marcação usam aulas avulsas criadas pela API para o dia de hoje, com horário sorteado a partir da hora atual (janela de presença aberta) e removidas no `finally`; a aula "fechada" é uma avulsa de hoje à 00:10-00:30, então depende de já ser mais de 01:00 em São Paulo. O cancelamento usa uma aula de grade de domingo com horário sorteado, removida no `finally`. Quando não há horário livre hoje, o teste usa `test.skip` com o motivo. Presenças de datas passadas entram por SQL (`suporte/presenca.ts`), em aulas do seed da semana passada. Os cenários que dependem do evento de graduação (global) ficam no bloco serial de `graduacao.spec.ts` (ver acima), para não disputarem a data com outro arquivo.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| Aluno marca Vou e desmarca | desktop e celular | Contador "1 vai" -> "2 vão" ao marcar (botão `aria-pressed`, "✓ Vou") e de volta a "1 vai" ao desmarcar; a API concorda. |
| Início mostra a Próxima aula | desktop e celular | Card com o botão "Vou na aula das HH:mm". |
| Presença contada | desktop e celular | Em aula já encerrada com presença: "Presença contada" na aba Aulas, sem botão; quem não marcou vê "Janela fechada"; a aba Presença lista o item "contada". |
| Professor inclui e tira no Controle de presença | desktop e celular | "Professor pode ajustar até DD/MM", "+ Incluir aluno" com busca, marca a pessoa e confirma em "Incluir 1 aluno", origem "incluída pelo professor", contador "1 presença"; "Tirar" com confirmação volta a "Ninguém registrado nesta aula.". |
| Semana passada: só leitura para o professor, editável para o dono | desktop e celular | Professor vê "Fora do prazo: estas presenças só podem ser consultadas." sem Tirar nem Incluir; o dono vê os dois e tira o aluno. |
| Professor inclui dois de uma vez | desktop e celular | Marca duas pessoas no "+ Incluir aluno", "Incluir 2 alunos", toast "2 alunos entraram na chamada.", "2 presenças". |
| Dono vê os alunos sumidos | desktop e celular | Botão "Sumidos" da Área do dono abre `/app/sumidos`; quem treinou só há 3 semanas aparece com "Último treino DD/MM · há N dias"; quem treinou na semana passada não aparece. |
| Setas do Controle de presença | desktop e celular | Professor: "Esta semana", volta só uma semana ("DD/MM a DD/MM") e a seta trava; o dono volta até a semana de `ajustaDesde` (`GET /presencas/prazo`), ou 12 semanas sem graduação anterior, e a seta trava. |
| Dono inclui na semana passada | desktop e celular | Origem "incluída pelo dono" no Controle de presença e na aba Presença do aluno. |
| Dono cancela aula com marcação aberta | desktop e celular | O aluno vê "Cancelada · motivo", sem botão nem contador; pela API `euVou` falso e `vao` 0. |
| Aluno não acessa o Controle de presença | desktop e celular | Sem item no menu nem atalho; `/app/chamada` leva para `/app/inicio`. |
| Professor chega no Controle de presença pelo atalho | desktop e celular | O botão "Controle de presença" da Início abre `/app/chamada`. |
| API: cancelar o dia com janela fechada | só desktop | 422 `ERR030`. |
| API: aluno nas rotas da chamada | só desktop | GET, POST e DELETE da chamada e `GET /presencas/prazo` respondem 403. |
| API: professor nos sumidos e nas presenças de outro aluno | só desktop | `GET /presencas/sumidos` e `GET /graduacoes/alunos/{id}/presencas` respondem 403. |
| API: professor nos aptos | só desktop | `GET /graduacoes/aptos` e `POST /graduacoes/aptos/{id}` respondem 403. |
| API: marcar fora da semana atual | só desktop | Semana passada e semana que vem respondem 422 `ERR025`. |

### Área do dono (`tests/area-dono.spec.ts`)

Contas com nome único (`nomear`), porque a lista é paginada em memória e contas de outros testes podem empurrar a sua para outra página: sempre busca pelo nome antes.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| O dono vê o card na Início | desktop e celular | Card "Área do dono" com atalhos que abrem Professores e Graduação (o atalho "Sumidos" é coberto em Presença). |
| Aluno e professor não veem o card | desktop e celular | O card não existe na Início deles. |
| Professores: busca sem acento | desktop e celular | "JOAO <ÚNICO>" acha "João <único>"; a linha mostra e-mail e cargo e o homônimo fica de fora. |
| Professores: filtro por cargo | desktop e celular | Chips Professores, Alunos e Todos (`aria-pressed`). |
| Professores: paginação | desktop e celular | 8 contas: "8 pessoas", 7 na página 1, "Página 1 de 2", Próxima e Anterior. |
| Professores: promover pelo painel | desktop e celular | Cancelar no painel não muda nada; "Tornar professor" confirma e atualiza o chip. |
| Graduação: busca sem acento e paginação | desktop e celular | "ANGELA ..." acha "Ângela ..."; 8 alunos: "8 alunos", 7 por página. |
| Graduação: remover registro antigo e o atual | desktop e celular | Mensagens de confirmação, toast "Registro removido.", faixa do painel e card do aluno voltam para a anterior; o último remove deixa "Sem graduação". |
| API: remoção de registro | só desktop | 403 para professor e aluno; 404 `ERR015` para registro de outro aluno ou já removido; dono remove (200, `atual` nulo). |
| API: lista de alunos da graduação | só desktop | `GET /graduacoes/alunos` devolve o array inteiro, sem paginação. |

### Agenda de aulas (`tests/agenda.spec.ts`)

A agenda é global e os dois projetos rodam em paralelo, então cada projeto usa uma semana (`desktop` = semana que vem, `celular` = daqui a 2 semanas, calculadas em `suporte/datas.ts` a partir de "hoje" em São Paulo) e cada cenário um dia da semana diferente. O cenário da grade usa o domingo (sem grade no seed) com horários próprios por projeto. Todo teste desfaz o que criou, inclusive no `finally`, pela API.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| O aluno vê a grade do seed na segunda | desktop e celular | Aba Aulas com 07:10, 18:00, 19:00 e 20:30 (Gi) e "até 19:00". |
| Cancelar uma aula com motivo | desktop e celular | Dono cancela a aula das 18:00 da terça; o aluno vê "Cancelada · motivo"; o dono desfaz e volta ao normal. |
| Cancelar o dia inteiro | desktop e celular | Aviso "Dia sem aula" com motivo e as 5 aulas da quarta canceladas; desfazer limpa tudo. |
| Aula avulsa | desktop e celular | Dono cria aula avulsa na quinta; o aluno vê a etiqueta "Avulsa"; ao remover, some. |
| Adicionar, editar e tirar da grade uma aula | desktop e celular | Dono adiciona aula no domingo, aluno vê; a edição troca o horário (vale a partir de amanhã, então o aluno da semana que vem só vê o novo); tirar a versão editada da grade funciona e deixa o domingo limpo. |
| Aluno vê cancelamento sem novo login | desktop e celular | Aluno já está na aba Aulas (sexta), o dono cancela o dia por API, o aluno troca para Perfil e volta a Aulas e vê as aulas "Cancelada" (a aba recarrega ao reentrar). |
| Tirar uma aula da grade | desktop e celular | Aula recém-adicionada sai da grade com confirmação e o card dela some para o aluno. |
| Aluno e professor não veem a Agenda | desktop e celular | Sem item no menu, sem card/atalho nem "Gerenciar agenda"; `/app/agenda` leva para `/app/inicio`. |
| O dono chega na Agenda pelo atalho e pelo Perfil | desktop e celular | O card "Área do dono" e "Gerenciar agenda" abrem `/app/agenda`. |
| API: aluno e professor não alteram grade nem cancelam | só desktop | 403 em `POST /aulas/grade` e `POST /agenda/cancelamentos`. |
| API: cancelamento com data passada | só desktop | 400 com `codigo` `ERR018`. |

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
