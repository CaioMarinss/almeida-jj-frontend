# Changelog

Todas as mudanças relevantes do frontend Almeida JJ ficam registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [versionamento semântico](https://semver.org/lang/pt-BR/). Cada versão corresponde a uma tag `vX.Y.Z` no git.

**Como usar:** anote as mudanças em `[Não lançado]` conforme forem feitas. Ao lançar, rode `./set-version.sh X.Y.Z`. O script transforma essa seção na nova versão e atualiza o `package.json` e o `package-lock.json`.

## [Não lançado]

### Adicionado
- **Presença**: botão "Vou" na aba Aulas (e na Início) para marcar e desmarcar a ida à aula da semana, com o contador "N vão"; depois que a janela fecha (fim da aula + 30 min) aparece "Presença contada" ou "Janela fechada".
- Card **Próxima aula** na Início, no lugar do "Check-in em breve", com o botão "Vou".
- Aba **Presença** com "X de Y presenças até a graduação de DD/MM", barra de progresso e a lista das presenças contadas (origem: contada, incluída pelo professor ou pelo dono).
- Tela **Chamada** (`/app/chamada`, professor e dono): escolha do dia e da aula, quem está presente, "Tirar" com confirmação e "+ Incluir aluno"; fora do prazo a chamada fica só para consulta, com o aviso de até quando o professor pode ajustar. Item "Chamada" no menu e atalho na Início.
- **Mínimos de presença** na próxima graduação (para grau e para faixa) e botão "Ver aptos" na tela Graduação, com as seções "Troca de grau" e "Troca de faixa", o botão "Graduou" (liberado a partir da data do evento) e a confirmação já preenchida com a sugestão.
- Testes e2e da presença (`e2e/tests/presenca.spec.ts`) e dos aptos (`e2e/tests/graduacao.spec.ts`).

### Alterado
- Próxima graduação: o formulário exige os dois mínimos ("Mínimo para grau" e "Mínimo para faixa"); a linha mostra "Mínimo: N grau · M faixa".

### Corrigido
- Início: quem ainda não tem graduação também vê a linha de presenças do ciclo; "1 presença" no singular.
- Chamada: trocar de dia durante "Tirar"/"Incluir" não trava mais a lista de aulas (a troca fica bloqueada enquanto salva); para uma aula de dia futuro aparece "A chamada abre no dia da aula."; a tela recarrega ao voltar e se atualiza quando o servidor recusa a operação (ERR027, ERR028, ERR029).
- "Vou": em caso de erro de marcação já feita ou inexistente o botão reflete o estado real, e janela fechada recarrega a agenda.
- Aba Presença: `aria-valuenow` da barra nunca passa de `aria-valuemax`; o contador "N vão" some quando ninguém vai.
- Graduação, "Ver aptos": modal rotulado pelo título e listas em ordem alfabética (aptos primeiro).

## [0.2.5] - 2026-11-08

### Adicionado
- Aba **Aulas** com a agenda real: tira de 7 dias com setas de semana (até 4 semanas à frente), cartões com horário, modalidade, "Cancelada · motivo" e etiqueta "Avulsa", e aviso quando o dia inteiro está cancelado.
- Tela **Agenda** (`/app/agenda`), só para o dono, com "Grade semanal" (adicionar, editar e tirar aulas da grade; edição e remoção valem a partir de amanhã) e "Exceções" (cancelar uma aula, cancelar o dia inteiro ou criar aula avulsa, com opção de desfazer). Acesso pelo menu lateral, pelo atalho "Agenda" no Início e por "Gerenciar agenda" no Perfil.
- Chip global `.ajj-chip-modalidade` e tokens `--ajj-modalidade-kids` e `--ajj-modalidade-teens`.
- Testes e2e da agenda (`e2e/tests/agenda.spec.ts`).

### Alterado
- Menu lateral do desktop: Perfil logo acima de Sair.

## [0.2.4] - 2026-11-07

### Adicionado
- Início: card "Área do dono" logo abaixo da saudação, só para o dono, com atalhos para Professores e Graduações.
- Registro de graduação: a janela do aluno agora rola (o histórico ficava cortado no desktop).
- Graduação: o dono remove um registro do histórico do aluno (botão de lixeira com confirmação que diz se a faixa atual muda); o aviso de data agora compara com a faixa atual: "Data anterior à faixa atual: entra só no histórico."
- Graduação com a lista inteira em memória: busca sem acento, filtro de faixa, páginas de 7 e contador; a linha alterada continua visível até mudar a busca, o filtro ou a página. A próxima graduação virou uma linha compacta com o botão "Alterar".
- Professores com busca por nome, filtro por cargo (Todos, Professores, Alunos), páginas de 7 e painel de baixo para tornar ou remover professor.
- Busca sem acento e paginação compartilhada (`ajj-paginacao`, 7 por página) para as listas do dono.
- Tela **Graduação** (`/app/graduacao`), só para o dono: lista de alunos com busca por nome e filtro por faixa. Acesso pelo menu lateral e por "Gerenciar graduações" no Perfil.
- Registro de faixa e grau pelo dono (data padrão hoje; data passada mais recente que a faixa atual passa a ser a atual, mais antiga entra só no histórico) e agendamento, troca e cancelamento da próxima graduação da academia.
- Card de graduação no Início: faixa e graus, próxima graduação, evolução e histórico completo.
- Faixas IBJJF (infantis, adultas e mestres) na barra de faixa, com até 10 graus nas infantis e 6 na preta.
- Botão "Fechar" no registro de graduação (necessário no celular) e mensagens de erro com "Tentar de novo" quando a próxima data, as faixas ou o histórico não carregam.
- A data "de hoje" da graduação usa o horário de São Paulo, independente do fuso do aparelho.
- Testes e2e de graduação (`e2e/tests/graduacao.spec.ts`) e da área do dono (`e2e/tests/area-dono.spec.ts`).

### Alterado
- Registro de graduação: salvar e remover não rodam ao mesmo tempo (a lixeira e o Salvar ficam desabilitados enquanto o outro está em andamento); se a remoção falha com `ERR015` (registro já removido, por exemplo em outra aba), o histórico é recarregado; o botão Fechar fica fixo em um cabeçalho e só o histórico rola.
- A API passa a calcular a faixa atual pelo registro ativo de data mais recente; `GET /graduacoes/alunos` devolve a lista inteira (sem parâmetros) e o registro devolve também `atual`.

## [0.2.3] - 2026-11-05

### Adicionado
- Workflow `keep-alive-api.yml`: chama a API a cada 10 minutos para o plano gratuito do Render não desligá-la (o primeiro login depois de um tempo parado demorava até 1 minuto).

## [0.2.2] - 2026-11-05

### Adicionado
- Cargo **Dono** no perfil (Dono > Professor > Aluno).
- Tela **Professores** (`/app/professores`), só para o dono: torna um aluno professor ou tira o cargo, com confirmação. Acesso pelo menu lateral no computador e por "Gerenciar professores" no Perfil.
- Testes e2e de cargos (`e2e/tests/cargos.spec.ts`).

### Alterado
- O ambiente dos testes e2e (`docker-compose.yml`) passa a vir do repositório da API.
- Versão nova do app é aplicada sozinha: a página recarrega assim que ela termina de baixar, sem a pergunta "Atualizar agora?".

## [0.2.1] - 2026-11-04

### Adicionado
- Regras de senha forte (mínimo 8 caracteres, maiúscula, minúscula, número, caractere especial, sem espaços) no cadastro, na redefinição e na troca de senha, com lista de regras que acompanha a digitação.
- Testes ponta a ponta (Playwright) em `e2e/`, rodando no GitHub Actions a cada push ou PR para `dev`.

## [0.2.0] - 2026-11-02

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
