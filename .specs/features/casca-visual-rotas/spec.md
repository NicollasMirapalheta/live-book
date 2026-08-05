# Casca visual das rotas (app-shell) — Specification

**Escopo**: Medium
**Status**: Done — validado no navegador (PASS, ver `validation.md`); 318 testes verdes, build verde
**Origem**: remedia lacuna da Fase 2B — as rotas ganharam marcação (`app-reader`,
`app-new`, `app-import`) mas nenhuma folha de estilo; só estante e side menu foram
estilizados (`ui.css`). Consequência observada ao abrir na web: o leitor abre com o motor
espremido numa faixa de altura minúscula, e as telas de criar/importar aparecem cruas.

## Problem Statement

O motor de virada é `height: 100%` e precisa de um ancestral com altura definida. No
`App.tsx` original ele era a raiz do app (filho do `#root`, que é `height:100%`) e
preenchia a tela. A Fase 2B moveu o motor para dentro de `<main className="app-reader">`
**sem CSS**, quebrando a cadeia de altura: `#root(100%) → main.app-reader(auto) →
.lb-root(100% de auto → colapsa)`. O `useStageScale` mede altura ~0, cai no piso 0.25 e o
livro vira uma tira. Além disso, criar volume e importar fotos abrem em HTML cru, sem a
identidade visual que o `AD-015` já define.

## Goals

- [ ] O leitor ocupa a viewport inteira e o livro abre no tamanho correto (não espremido)
- [ ] As cascas de rota (leitor, criar, importar) e seus estados (carregando, não
      encontrado, vazio) têm acabamento coerente com o `AD-015`, sem parecer cru
- [ ] Nenhuma regressão no motor (`AD-022`) nem na estante/side menu já estilizados

## Out of Scope

| Item | Motivo |
|---|---|
| Editor de conteúdo / autoria | É a Fase 4; aqui o volume vazio continua vazio |
| Estante e side menu | Já estilizados na 2B (`ui.css`); só tocados se preciso p/ consistência |
| Modo escuro | Fora de escopo do produto (roadmap) |
| Redesenho do motor / geometria | `AD-022`; a correção é na CASCA, não no motor |
| Semear conteúdo no "Novo volume" | Continua criando doc vazio (Fase 4 preenche) |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Verificação das ACs visuais | preview do navegador + gate de build; **não** vitest | CSS/layout não renderiza em jsdom (getBoundingClientRect = 0); a estratégia do projeto não testa CSS por unidade | s |
| Onde mora o CSS da casca | novo `src/ui/app-shell.css`, importado em `main.tsx` | espelha `ui.css`; mantém CSS plano com prefixo `app-` (sem CSS-in-JS, `AD-015`) | s |
| Altura do leitor | `.app-reader` recebe `height: 100%` (cadeia contínua a partir do `#root`) + flex para centralizar | reusa a cadeia `html/body/#root { height:100% }` já existente; evita `100vh` (barra do mobile) | s |
| Volume vazio | mostra um aviso curto com link para importar fotos, em vez de livro quase em branco | o fluxo de criação gera doc vazio (Fase 4 é a autoria); sem aviso, o usuário acha que quebrou | s |

**Open questions:** nenhuma — todas resolvidas acima.

---

## User Stories

### P1: Leitor ocupa a tela ⭐ MVP

**User Story**: Como leitora, quero abrir um volume e ver o livro no tamanho certo,
porque hoje ele abre espremido numa faixa e fica ilegível.

**Why P1**: É o defeito que faz o app parecer quebrado. Bloqueia qualquer uso real.

**Acceptance Criteria**:

1. QUANDO um volume é aberto no leitor ENTÃO o `.app-reader` DEVE dar ao motor um container de altura igual à da viewport (cadeia contínua a partir do `#root`)
2. QUANDO o leitor renderiza numa janela de altura normal (ex.: ≥ 700 px) ENTÃO a escala do palco NÃO DEVE ficar presa no piso 0.25 — o livro DEVE usar a altura disponível
3. QUANDO a janela é redimensionada ENTÃO o livro DEVE reescalar para caber, sem barra de rolagem vertical na página
4. QUANDO o modo retrato do celular está ativo ENTÃO o comportamento da Fase 3 (`AD-029`) DEVE continuar idêntico

**Independent Test**: preview no navegador — abrir `/b/:id` do demo semeado e ver o livro ocupando a altura da tela; comparar antes/depois com screenshot.

---

### P1: Cascas de rota com acabamento ⭐ MVP

**User Story**: Como autora, quero que criar e importar tenham a mesma identidade visual
do resto, porque hoje são HTML cru e parecem inacabadas.

**Why P1**: Faz parte de "cada fase entrega algo funcional"; a 2B deixou essas telas sem estilo.

**Acceptance Criteria**:

1. QUANDO a rota de criar volume (`/new`) é aberta ENTÃO ela DEVE usar a paleta/tipografia do `AD-015` (fundo, papel, Fraunces/Inter, espaçamento), não estilos de navegador padrão
2. QUANDO a rota de importar (`/b/:id/import`) é aberta ENTÃO ela DEVE ter o mesmo tratamento visual e um alvo de drop claramente delimitado
3. QUANDO o leitor está em estado de carregando ou não-encontrado ENTÃO a mensagem DEVE ser centralizada e estilizada, não texto solto no topo
4. QUANDO o link de resgate é exibido após criar ENTÃO ele DEVE ser legível e destacado (bloco de código já estilizado), sem estourar a largura

**Independent Test**: preview — visitar `/new`, criar, ver a tela de resgate; visitar `/b/:id/import`; forçar `/b/inexistente` para o estado não-encontrado.

---

### P2: Volume vazio tem afordância

**User Story**: Como autora que acabou de criar um volume, quero entender que ele está
vazio de propósito e como adicioná-lo, porque um livro quase em branco parece um bug.

**Why P2**: Melhora a clareza, mas não é o defeito crítico; o leitor já abre.

**Acceptance Criteria**:

1. QUANDO o volume aberto não tem páginas de miolo ENTÃO o leitor DEVE exibir um aviso curto ("volume vazio") com um link para a rota de importar fotos
2. QUANDO o volume tem ao menos uma página ENTÃO o aviso NÃO DEVE aparecer

**Independent Test**: unit — renderizar o leitor com um doc de `pages: []` e ver o aviso + link; com uma página, não ver. (Este é o único AC testável por vitest, pois é comportamento de JSX, não CSS.)

---

## Edge Cases

- QUANDO a janela é muito baixa (ex.: 400 px de altura) ENTÃO o livro DEVE encolher para caber, nunca vazar por baixo com scroll
- QUANDO o leitor é aberto direto por URL de página (`/b/:id/p/3`) ENTÃO a altura DEVE estar correta desde o primeiro frame (sem "pulo" de espremido para cheio)
- QUANDO a estante e o side menu já estilizados são revisitados ENTÃO NÃO DEVE haver regressão visual

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| SHELL-01 | P1 — altura do leitor | app-shell.css | Done |
| SHELL-02 | P1 — reescala sem scroll | app-shell.css | Done |
| SHELL-03 | P1 — casca de criar/importar estilizada | app-shell.css | Done |
| SHELL-04 | P1 — estados loading/not-found estilizados | app-shell.css | Done |
| SHELL-05 | P2 — afordância de volume vazio | ReaderRoute.tsx + test | Done |

---

## Success Criteria

- [ ] No demo semeado, o leitor abre com o livro ocupando a altura da tela (screenshot antes/depois)
- [ ] `/new`, `/b/:id/import`, loading e not-found parecem parte do mesmo produto
- [ ] Volume recém-criado (vazio) mostra como adicionar fotos, não um livro em branco silencioso
- [ ] `npm test` e build seguem verdes; caracterização da Fase 0 intacta; nenhuma mudança em `src/live-book/`
