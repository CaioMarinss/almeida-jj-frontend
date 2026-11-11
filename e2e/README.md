# Testes ponta a ponta (e2e)

Testam o sistema inteiro como um usuário: navegador real (Playwright) → front → API → Postgres. Os e-mails ficam presos no [Mailpit](https://mailpit.axllent.org/) e os testes leem deles os links de verificação e de redefinição.

Não rodam no `npm test`. No GitHub são **opcionais**: só rodam à mão (veja [No GitHub](#no-github-actions)).

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
    └── telas.ts         helpers de tela (campo, botão, toast, alerta, login, login do dono, troca de aba)
```

## Cenários

São 79 testes. A área do dono foi reformulada (abas Presenças, Financeiro, Graduação, Alunos e Perfil) e os cenários correspondentes ainda não foram rodados nesta versão; a última rodada completa, antes da reformulação, passou sem falhas.

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
| Bloqueia senha fraca, mostra o erro da API e troca com senha forte | Perfil → "Trocar senha" abre `/app/perfil/senha`. Senha fraca não chama a API. Senha atual errada mostra "Senha atual incorreta.". Com os dados certos, troca a senha, desloga e entra com a nova. |
| O dono abre Trocar senha pelo Perfil e volta pela seta | desktop e celular | O dono entra em `/app/chamada`; Perfil mostra "Sair da conta" e "Trocar senha"; a tela `/app/perfil/senha` tem a seta "Voltar para o perfil". |
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
| O dono vê o cargo e chega em Alunos pela aba | desktop e celular | Chip "Dono" no Perfil, sem "Gerenciar professores"; a aba Alunos abre `/app/alunos` e a ficha do próprio dono não tem botão de cargo. |
| O dono promove e rebaixa um aluno pela ficha | desktop e celular | Busca em Alunos, toque na linha abre a ficha; "Tornar professor" com confirmação e toast; o aluno entra e vê "Professor". "Voltar a aluno" confirma em "Remover" e o aluno volta a "Aluno". |
| O filtro Professores da lista de alunos | desktop e celular | O professor promovido por API aparece com o chip "Professores" e a linha mostra "Professor". |
| Aluno e professor não acessam Alunos | desktop e celular | Nenhum dos dois vê "Gerenciar professores", e abrir `/app/alunos` leva para `/app/inicio`. |
| O menu lateral do dono tem Alunos | só desktop | O item do menu abre `/app/alunos`. |
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
| Aluno e professor não veem Graduação | desktop e celular | Sem item no menu; `/app/graduacao` leva para `/app/inicio`. |
| O dono chega em Graduação pela aba | desktop e celular | A aba abre a tela com o evento (`app-proxima-graduacao`) e a lista de aptos. |
| O dono abre a ficha pela lista e volta pela seta | desktop e celular | Alunos → toque na linha → ficha; "Voltar para os alunos" volta para a lista. |
| O menu lateral do dono tem Graduação | só desktop | O item do menu abre a tela. |
| Conta desativada antes de salvar | só desktop | Desativa a conta com a ficha aberta na aba Graduações; salvar mostra o alerta "Aluno não encontrado" e a tela continua usável. |
| A ficha do aluno mostra as presenças | desktop e celular | Presença da semana passada (SQL) aparece em `app-presencas-aluno` na aba Presenças da ficha, como "contada". |
| Agendar e cancelar a próxima graduação (botão "Alterar") | só desktop (serial) | Preenche os mínimos (`#minimo-grau`, `#minimo-faixa`); a linha mostra "Mínimo p/ grau" 10 e "Mínimo p/ faixa" 20; aluno vê "Próxima graduação: DD/MM"; ao cancelar, "Sem data definida para a próxima graduação". |
| Trocar a data agendada (botão "Alterar") | só desktop (serial) | A nova data (com os mínimos) substitui a anterior. |
| A aba Presença mostra X de Y | só desktop (serial) | Evento daqui a 10 dias com mínimo de grau 5 e 2 presenças da semana passada (SQL): título "2 de 5 presenças até a graduação de DD/MM", "Faltam 3", barra `aria-valuenow=2`, 2 itens "contada". |
| Antes da data o apto faz o exame e o Graduou fica desabilitado | só desktop (serial) | Aba Graduação lista o aluno com "2/2 · apto" e o botão Exame (sem Graduou); quem tem 1 de 2 mostra "faltam 1". Exame aprovado sem a opção "Já registrar a graduação" (evento ainda no futuro) mostra "Aprovado · nota 8,5", "Ver", Graduou desabilitado e "Disponível em DD/MM". |
| Mínimos, exame aprovado com a graduação e "Graduado" | só desktop (serial) | Salvar fica desabilitado até os dois mínimos; evento para hoje; o resumo mostra "1 apto"; a folha de exame (Aprovado, "Nota (0 a 10)", "Observação (opcional)") traz "Já registrar a graduação (Faixa Branca · 1 grau)" marcada; "Salvar exame" mostra o toast "<nome> graduou.", o aluno vira "Graduado", o resumo "0 aptos · 1 exame feito · 1 graduado" e a API tem a Faixa Branca 1 grau. |
| Exame aprovado sem graduar libera o Graduou; reprovado não | só desktop (serial) | Aprovado com nota 10 e a opção desmarcada: "Aprovado · nota 10,0" e Graduou habilitado, que abre a confirmação e termina em "Graduado". Reprovado com nota 4: "Reprovado · nota 4,0" sem o botão Graduou. |
| Exame de aluno ainda não apto | só desktop (serial) | Aluno com "faltam 4" na seção "Ainda não aptos" salva exame reprovado com observação; a aba Exames da ficha mostra a data do evento, "Reprovado · nota 4,0" e a observação. |
| Editar e remover o exame | só desktop (serial) | "Ver" reabre a folha: trocar para Aprovado 7,5 e salvar atualiza a linha; "Remover exame" confirma, mostra "Exame removido." e a linha volta ao botão Exame. |
| Cancelar a graduação com exame | só desktop (serial) | "Cancelar data" mostra o alerta "Esta graduação tem exames registrados e não pode ser cancelada." (`ERR037`) e a data continua; a API responde 422. |
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
| Dono marca e desmarca na chamada em lista | desktop e celular | `/app/chamada` com a busca (`#busca-chamada`): tocar em um aluno de "Outros alunos" leva para "Presentes · 1" com "incluído por você" e o contador da aula "1 pres."; tocar no presente pede "Tirar a presença de NOME?" e, confirmado, volta a "Presentes · 0" e "0 pres.". |
| Dono inclui dois alunos em seguida | desktop e celular | Dois toques seguidos: "Presentes · 2" e "2 pres.". |
| Semana passada: dono edita a chamada | desktop e celular | O aluno com presença da semana passada aparece em Presentes com "marcou Vou", sem aviso de "Fora do prazo"; o dono tira a presença depois de confirmar e o aluno volta para "Outros alunos". |
| Setas da Presenças | desktop e celular | O dono volta até a semana de `ajustaDesde` (`GET /presencas/prazo`), ou 12 semanas sem graduação anterior, e a seta trava; "Esta semana" bloqueia a seta para frente. |
| Dono inclui na semana passada | desktop e celular | Origem "incluído por você" na chamada e "incluída pelo dono" na aba Presença do aluno. |
| Dono cancela aula com marcação aberta | desktop e celular | O aluno vê "Cancelada · motivo", sem botão nem contador; pela API `euVou` falso e `vao` 0. |
| Aluno e professor sem a Presenças de gestão | desktop e celular | Nem menu nem aba "Presenças" (a do aluno é "Presença"), sem atalho na Início; `/app/chamada` leva para `/app/inicio`, sem "Editar grade". |
| Dono entra direto na Presenças | desktop e celular | O login do dono cai em `/app/chamada`; "Editar grade" abre `/app/grade`. |
| API: cancelar o dia com janela fechada | só desktop | 422 `ERR030`. |
| API: aluno nas rotas da chamada | só desktop | GET, POST e DELETE da chamada e `GET /presencas/prazo` respondem 403. |
| API: professor na chamada e na lista de alunos | só desktop | `GET`/`POST`/`DELETE` da chamada, `GET /presencas/prazo`, `GET /alunos` e `GET /alunos/painel` respondem 403. |
| API: professor nos sumidos e nas presenças de outro aluno | só desktop | `GET /presencas/sumidos` e `GET /graduacoes/alunos/{id}/presencas` respondem 403. |
| API: professor nos aptos | só desktop | `GET /graduacoes/aptos` e `POST /graduacoes/aptos/{id}` respondem 403. |
| API: marcar fora da semana atual | só desktop | Semana passada e semana que vem respondem 422 `ERR025`. |

### Alunos (`tests/alunos.spec.ts`)

Contas com nome único (`nomear`), porque a lista é paginada em memória e contas de outros testes podem empurrar a sua para outra página: sempre busca pelo nome antes. A ficha do aluno com exame fica no bloco serial de `graduacao.spec.ts`, pelo evento de graduação global.

| Cenário | Onde roda | O que verifica |
|---|---|---|
| Busca sem acento e paginação | desktop e celular | "ANGELA ..." acha "Ângela ..."; 8 alunos: "8 alunos", 7 na página 1, "Página 1 de 2", Próxima e Anterior. |
| Filtro Sumidos e ficha | desktop e celular | O chip "Sumidos · N" lista quem treinou só há 3 semanas com "sumido · N dias" e esconde quem treinou na semana passada; a linha abre a ficha (Presenças no ciclo, Último treino, Último exame) e a aba Exames mostra "Nenhum exame registrado.". |
| Remover registro de graduação na ficha | desktop e celular | Aba Graduações: mensagens de confirmação, toast "Registro removido." e a faixa do aluno acompanha no card do Início. |
| Links antigos | desktop e celular | Para o dono: `/app/inicio`, `/app/aulas` e `/app/presenca` vão para `/app/chamada`; `/app/professores` e `/app/sumidos` para `/app/alunos`; `/app/agenda` para `/app/grade`. |
| Telas do dono barradas para aluno e professor | desktop e celular | `/app/chamada`, `/app/alunos`, `/app/graduacao` e `/app/grade` levam para `/app/inicio`. |
| API: remoção de registro | só desktop | 403 para professor e aluno; 404 `ERR015` para registro de outro aluno ou já removido; dono remove (200, `atual` nulo). |
| API: listas inteiras | só desktop | `GET /graduacoes/alunos` e `GET /alunos/painel` devolvem o array inteiro, sem paginação. |
| API: painel e exames só do dono | só desktop | `GET /alunos/painel`, `GET /alunos` e `GET /alunos/{id}/exames` respondem 403 para professor e aluno; o dono recebe a lista de exames vazia. |

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
| Aluno e professor não chegam na Grade | desktop e celular | Sem "Editar grade"; `/app/grade` e `/app/agenda` levam para `/app/inicio`. |
| O dono chega na Grade por Editar grade | desktop e celular | O botão da Presenças abre `/app/grade` com "Grade semanal" e "Cancelamentos e extras"; `/app/agenda` redireciona para ela. |
| API: aluno e professor não alteram grade nem cancelam | só desktop | 403 em `POST /aulas/grade` e `POST /agenda/cancelamentos`. |
| API: cancelamento com data passada | só desktop | 400 com `codigo` `ERR018`. |

## No GitHub (Actions)

`.github/workflows/e2e.yml` é **opcional** desde 2026-11-09: não roda no push nem no PR, só à mão em **Actions → e2e → Run workflow**, usando a branch `dev` da API. O repositório da API tem o mesmo workflow, que usa a `dev` deste repositório.

- Se algum teste falhar, a execução fica com ❌ e o relatório HTML fica para baixar em **Actions → execução → Artifacts → `relatorio-e2e`**. Quando falha, o log da API também aparece na execução.
- No CI, um teste que falha roda de novo uma vez. Se passar na segunda tentativa, ele aparece como "flaky".
- A API é privada, então o workflow baixa ela com a deploy key (só leitura) guardada no secret `API_DEPLOY_KEY`.

**Ordem de subida:** a API sempre sobe antes. Quando uma mudança mexe nos dois repositórios, faça o merge e o push na `dev` da API primeiro, espere o e2e dela ficar verde e só então faça o do front. Cada workflow testa contra a `dev` do outro repositório, então se o front subir antes, o e2e dele roda contra uma API sem a mudança e falha.

## Escrevendo um teste novo

- Crie o arquivo em `tests/` e use os helpers de `suporte/` (`criarContaAtiva`, `entrar`, `preencher`, `botao`, `linkDoEmail`...).
- Gere os dados com `emailUnico()` e `cpfValido()`. Nunca dependa de dados criados por outro teste.
- Busque campos por `campo(page, id)`, que usa o `id` do `ion-input`. Para botões, use `botao(page, 'Texto')`.
- Para garantir que o front não chamou a API, use `contarChamadas(page, 'POST', '/caminho')`.
- Teste que só chama a API não precisa rodar no celular: `test.skip(({ isMobile }) => isMobile, 'não depende da tela')`.
