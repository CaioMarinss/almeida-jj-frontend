# Frente 1 — Redesign "estilo app" com Ionic

Data: 2026-11-02. Repositório: `almeida-jj`. Roteiro geral: `../almeidaPresenca/docs/superpowers/specs/2026-11-01-roteiro-produto.md`. Parte da mesma entrega da frente 2 (branch `refactor/solid`, ainda não publicada).

## Intenção

Dar ao app da Almeida JJ uma cara moderna e esportiva, pensada para o aluno usar no celular, e já construída com componentes de app nativo, porque o foco do produto é virar um app das lojas (Android/iOS). O redesign não inventa dados: o que ainda não existe mostra estado vazio.

## Objetivos

- Todas as telas no novo visual: autenticação (login, cadastro, esqueci a senha, reenviar verificação, verificar, redefinir senha) e área logada (Início, Aulas, Presença, Financeiro, Perfil).
- Navegação de app: abas inferiores no celular; menu lateral fixo no computador.
- Base pronta para empacotar com Capacitor e instalável pelo navegador (PWA).
- Sistema de design único (tokens + componentes) que as próximas frentes reaproveitam.

## Não objetivos

- Funcionalidades novas (check-in, grade de aulas, graduação, financeiro, telas do professor). Os cards e telas dessas áreas mostram estado vazio.
- Gerar os projetos nativos Android/iOS ou publicar nas lojas.
- Foto de perfil (hoje é só local e se perde ao recarregar; volta quando houver armazenamento na API).
- Mudanças na API.

## Anti-objetivos

- Dados fictícios em qualquer tela.
- Visual "padrão Ionic" (iOS/Material) aparecendo por baixo do tema: todo componente usado deve estar tematizado.
- Comentários explicativos no código.
- Regressão de comportamento da frente 2 (sessão, interceptors, mensagens de erro, bloqueio de duplo envio, troca de senha que encerra a sessão).

## Restrições

- Angular 22 standalone, zoneless, signals, `OnPush` (exceto onde o Ionic exige o contrário internamente), `inject()`.
- Ionic 9 (`@ionic/angular`, API standalone em `@ionic/angular/standalone`, configuração com `provideIonicAngular()`); Capacitor (`@capacitor/core` + `@capacitor/cli`).
- Contrato da API conforme `../almeidaPresenca/CLAUDE.md` (frente 2).
- Licenças permissivas apenas (MIT/ISC/Apache).
- Deploy do front na Vercel como hoje (`npm run build`, `API_URL`).

## Abordagens consideradas

| | Abordagem | Troca |
|---|---|---|
| **A (escolhida)** | **Ionic + Capacitor**, tematizado por variáveis CSS | Componentes e navegação de app nativo (abas com estado, transições, gesto de voltar, safe areas); mesmo código vira app nas lojas. Custa reestruturar a navegação da área logada e algum peso no bundle. |
| B | Spartan UI + Tailwind agora, Capacitor depois | Ótimo no navegador, mas navegação de app teria de ser feita à mão; no celular pareceria "site dentro de app". |
| C | App nativo separado (Flutter/React Native) | Melhor experiência nativa, mas dois códigos para manter. |

Antes da escolha da biblioteca, o dono do produto escolheu, em mockups: layout "estilo app" (opção C da primeira rodada), direção visual **Esportivo** (vs. "Premium limpo") e a fonte **Oswald** para títulos (vs. Poppins Black, Saira Condensed, Archivo Black; a Barlow Condensed foi rejeitada).

## Decisões de design

### Identidade visual (decidido)

- Fundo quase preto, amarelo da marca em blocos fortes, números grandes, títulos em maiúsculas.
- Títulos, botões, rótulos curtos e números: **Oswald** (500–700), maiúsculas, `letter-spacing` leve.
- *Decisão do autor:* texto corrido em **Barlow** (400–600).
- *Decisão do autor:* ícones **Lucide** (`@lucide/angular`).
- Fontes servidas pelo Google Fonts com `display=swap`.

### Tokens (decisão do autor)

Definidos uma vez como variáveis CSS globais e mapeados para as variáveis do Ionic (`--ion-color-primary`, `--ion-background-color`, `--ion-text-color`, `--ion-font-family`, etc.).

| Token | Valor |
|---|---|
| `--ajj-fundo` | `#0B0B0C` |
| `--ajj-superficie` | `#161618` |
| `--ajj-superficie-2` | `#1E1E21` |
| `--ajj-borda` | `#2A2A2D` |
| `--ajj-texto` | `#F5F5F4` |
| `--ajj-texto-suave` | `#9C9C9C` |
| `--ajj-primaria` (amarelo) | `#F2CC0F`; texto sobre ela `#0B0B0C` |
| `--ajj-perigo` | `#FF6B6B` |
| `--ajj-sucesso` | `#4ADE80` |
| Raios | 10 / 14 / 20 px |
| Espaçamento | escala de 4 px (4, 8, 12, 16, 20, 24, 32) |

Contraste mínimo 4,5:1 para texto; `--ajj-texto-suave` só em texto secundário sobre `--ajj-fundo`/`--ajj-superficie`.

### Navegação (decidido o layout; detalhes do autor)

- **Celular:** `ion-tabs` com 5 abas — Início, Aulas, Presença, Financeiro, Perfil — ícone + rótulo, aba ativa em amarelo.
- **Computador (≥ 992 px):** *decisão do autor:* `ion-split-pane` com menu lateral fixo (logo, os 5 itens e "Sair"); as abas inferiores somem; conteúdo em coluna centralizada de no máximo 640 px.
- URLs: a área logada passa a viver sob `/app/...` (`/app/inicio`, `/app/aulas`, `/app/presenca`, `/app/financeiro`, `/app/perfil`), com redirecionamentos das URLs antigas (`/dashboard` → `/app/inicio`, `/calendario` → `/app/aulas`, `/financeiro` → `/app/financeiro`, `/configuracoes` → `/app/perfil`). Autenticação mantém as URLs atuais, inclusive `/verificar?token=` e `/resetar?token=` usadas nos e-mails.
- Após login: `/app/inicio`. `authGuard` protege `/app`.

### Componentes compartilhados (decisão do autor)

Em `shared/ui`, substituindo os atuais quando aplicável, todos `OnPush`, com testes:

- **Campo de formulário** sobre `ion-input` (rótulo visível, mensagem de erro abaixo do campo, máscara de CPF), mantendo a regra atual de mensagens (inclusive após `markAllAsTouched`).
- **Botão principal / secundário** (Oswald, maiúsculas, estado carregando que bloqueia duplo envio).
- **Card**, **chip/etiqueta**, **estado vazio** (ícone, título, texto, ação opcional).
- **Barra de faixa** (cor da faixa + ponta preta com graus 0–4), usada no Início quando houver dado.
- **Layout de autenticação** (topo com foto da academia `public/imgs/alunosPB.jpeg` escurecida e logo; formulário abaixo).
- **Casca da área logada** (`ion-split-pane` + menu + `ion-tabs`), lendo nome/perfil do `SessionService`; "Sair" com confirmação (`ion-alert` ou diálogo próprio) chamando `SessionService.encerrar()`.
- Notificações de sucesso/erro continuam passando pelo `Notificador`; a implementação passa a usar `ion-toast` (sucesso/aviso) e `ion-alert` (erro/confirmação) no lugar do SweetAlert2, que é removido.

### Telas (decidido o conteúdo; detalhes do autor)

- **Login, cadastro, esqueci a senha, reenviar verificação, verificar, redefinir senha:** mesmos campos e comportamentos da frente 2, no novo layout.
- **Início:** saudação "OSS, <PRIMEIRO NOME>"; card de check-in no estado "em breve" (botão desabilitado); card de faixa com estado vazio ("Sua graduação aparece aqui"); cards "No mês" e "Mensalidade" com estado vazio. Nenhum número fictício.
- **Aulas, Presença, Financeiro:** título + estado vazio com ícone Lucide e texto curto explicando que a funcionalidade chega em breve.
- **Perfil:** nome, e-mail e perfil (Aluno/Professor) vindos da sessão; edição do nome (continua só local, como na frente 2); troca de senha com senha atual (comportamento da frente 2: confirma, troca, avisa e encerra a sessão); botão "Sair".

### PWA e Capacitor (decisão do autor)

- Manifesto web (nome "Almeida JJ", cores `#0B0B0C`/`#F2CC0F`, ícones gerados a partir de `public/imgs/logoQuadradaRemovedBg.png` em 192 e 512 px) e service worker do Angular (`@angular/service-worker`) para o app ser instalável.
- Capacitor configurado (`capacitor.config.ts`, `appId` `br.com.almeidajj.app`, `webDir` apontando para a saída do build), **sem** gerar `android/` e `ios/`.
- `viewport-fit=cover` e respeito às safe areas.

### Acessibilidade e toque

Alvos de toque ≥ 44 px; foco visível em todos os controles; ícones decorativos com `aria-hidden`, botões só de ícone com rótulo acessível; `prefers-reduced-motion` desliga animações não essenciais; base de texto 16 px.

### Testes

- Specs dos componentes compartilhados (campo, botão com estado carregando, estado vazio, barra de faixa, casca com "Sair").
- Specs das telas mantidos/adaptados (todos os comportamentos da frente 2 continuam cobertos).
- Specs das rotas: redirecionamentos das URLs antigas e proteção de `/app`.
- Verificação no navegador (headless) dos fluxos da frente 2 no novo layout, em largura de celular (390 px) e de computador (1280 px). *Decisão do autor:* contra a API real local (Docker), como na frente 2, com usuários de teste semeados no Postgres local; fluxos que dependem de token válido de e-mail (verificar/redefinir com sucesso) ficam cobertos pelos specs unitários, e no navegador valida-se o caminho de token inválido/ausente.

### Zoneless com Ionic (decisão do autor)

O Ionic 9 é zoneless por padrão (BREAKING.md do Ionic 9), compatível com o modelo da frente 2. A primeira etapa da implementação é uma validação curta de `ion-tabs` com rotas por aba, `ion-router-outlet`, `ion-alert`/`ion-toast` e `ion-input` com o `ControlValueAccessor` do campo, em modo zoneless. Se algum componente não funcionar, ele é adaptado ou substituído por componente próprio; reintroduzir o zone.js só com aprovação do dono do produto.

## Entrega

Commits na branch `refactor/solid` do front, depois do trabalho da frente 2. Publicação junto com a frente 2 (API primeiro, depois front), mediante autorização do dono do produto. Atualizar `CLAUDE.md` e `CHANGELOG.md` do front.

## Fica a critério de quem implementar

- Nomes de arquivos/classes dentro de `shared/ui` e `features`.
- Detalhes finos de espaçamento, sombras e animações dentro dos tokens.
- Como gerar os ícones do PWA a partir do logo.
- Se a confirmação de "Sair" usa `ion-alert` ou o diálogo próprio existente.
