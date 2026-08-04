# Fase 2B — Rotas e biblioteca

**Escopo**: Large
**Status**: Draft
**Pré-requisito**: Fase 2A concluída

## Problem Statement

Com volumes persistidos (2A), falta como chegar até eles. Não há rota, não há estante, e
o único jeito de abrir um livro é ele estar hardcoded no `App.tsx`.

Esta fase também paga o furo ④ da revisão: os botões de fita de capítulo vivem dentro de
uma subárvore `aria-hidden` ([LiveBook.tsx:651](../../../src/live-book/LiveBook.tsx)) e a
ordem de foco não acompanha o spread. `AD-019` alocou a correção aqui, como critério de
aceite e não como backlog.

## Goals

- [ ] Todo volume tem URL própria, e toda página tem URL própria
- [ ] A estante é a home e escala para dezenas de volumes
- [ ] Trocar de volume sem sair da leitura
- [ ] O leitor é inteiramente navegável por teclado

## Out of Scope

| Item | Motivo |
|---|---|
| Imagem e capa real | Fase 3 — capas usam o gradiente da surface por enquanto |
| Editor | Fase 4 |
| Busca dentro do volume | não pedido; e a virtualização a inviabiliza sem índice próprio |
| Paginação da estante | volume esperado na v1 é baixo; `cursor` já existe na interface |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| URL canônica | número impresso (`/b/:id/p/:page`) | é o que o leitor vê; folha é conceito interno | s |
| Toda virada atualiza a URL | `navigate(..., { replace: true })` | sem `replace`, folhear 40 páginas enterra o botão voltar | s |
| Rota de capítulo | resolve e redireciona para `/p/:page` | mantém uma única URL canônica por posição | s |
| Conversão página ↔ folha | só por `src/book/units.ts` | `AD-010`; é onde o bug histórico volta | s |
| Estante carrega | `BookSummary`, nunca `BookDoc` | 40 documentos de 180 KB para desenhar 40 capas é absurdo | s |
| Side menu acima de ~12 volumes | rola, com lombada de largura fixa | a estante é o lugar de coleção grande | s |
| Volume aberto por link público | `PublicAdapter`, sem cromo de edição | `canWrite` é a única chave; nada de `if` espalhado | s |

**Open questions:** nenhuma.

---

## User Stories

### P1: Rotas e posição na URL ⭐ MVP

**Acceptance Criteria**:

1. QUANDO `/b/:id/p/:n` é aberta ENTÃO o volume DEVE abrir na página impressa `n`
2. QUANDO o leitor vira a página ENTÃO a URL DEVE ser atualizada **substituindo** a entrada de histórico
3. QUANDO o usuário usa voltar/avançar do navegador ENTÃO o livro DEVE navegar para a posição correspondente
4. QUANDO `/b/:id/c/:slug` é aberta ENTÃO o sistema DEVE resolver o capítulo e redirecionar para a URL canônica de página
5. QUANDO `:n` está fora do intervalo ENTÃO o sistema DEVE limitar ao intervalo válido, sem erro
6. QUANDO `/s/:token` é aberta ENTÃO o volume DEVE abrir em leitura, sem nenhum controle de edição no DOM

---

### P1: Estante ⭐ MVP

**Acceptance Criteria**:

1. QUANDO a home é aberta ENTÃO DEVE listar os volumes com capa, título e metadados
2. QUANDO não há volume ENTÃO DEVE aparecer estado vazio com ação de criar
3. QUANDO a listagem está carregando ENTÃO DEVE aparecer estado de carregamento, não tela em branco
4. QUANDO um cartão recebe foco por teclado ENTÃO o anel de foco DEVE estar visível
5. QUANDO a estante é montada ENTÃO nenhuma requisição DEVE carregar documento completo

---

### P1: Troca rápida de volume ⭐ MVP

**Acceptance Criteria**:

1. QUANDO o side menu é aberto no leitor ENTÃO DEVE listar os demais volumes como lombadas
2. QUANDO uma lombada recebe hover ou foco ENTÃO DEVE deslizar para fora da pilha e revelar a capa
3. QUANDO uma lombada é acionada ENTÃO o leitor DEVE trocar de volume sem recarregar a página
4. QUANDO o volume atual aparece na lista ENTÃO DEVE estar marcado como atual
5. QUANDO o side menu é montado ENTÃO ele DEVE ficar **fora** de `src/live-book/`, como irmão do motor

---

### P1: Acessibilidade do leitor ⭐ MVP

**User Story**: Como pessoa que navega por teclado ou leitor de tela, quero conseguir ler
um volume inteiro sem mouse.

**Why P1**: `AD-019`. O defeito já existe e é conhecido; sem virar critério de aceite,
nunca é feito.

**Acceptance Criteria**:

1. QUANDO o leitor é percorrido com Tab ENTÃO nenhum elemento focável DEVE estar dentro de subárvore `aria-hidden`
2. QUANDO um controle recebe foco ENTÃO o indicador DEVE ser visível, com contraste suficiente
3. QUANDO o livro vira a página ENTÃO o foco NÃO DEVE permanecer numa folha desmontada
4. QUANDO um leitor de tela percorre o spread ENTÃO a ordem de leitura DEVE ser página esquerda e depois direita
5. QUANDO um controle é usado em tela pequena ENTÃO seu alvo de toque DEVE ter ao menos 44×44 px
6. QUANDO as correções são aplicadas ENTÃO **toda a caracterização da Fase 0 DEVE continuar verde**

---

## Edge Cases

- QUANDO o id não existe ENTÃO DEVE aparecer "não encontrado", com caminho de volta à estante
- QUANDO o slug de capítulo não existe ENTÃO DEVE abrir na primeira página, sem erro
- QUANDO dois capítulos geram o mesmo slug ENTÃO o primeiro DEVE vencer, de forma determinística
- QUANDO a URL é editada à mão para uma página não numerada (capa) ENTÃO DEVE cair na posição válida mais próxima
- QUANDO o volume tem uma página só ENTÃO a navegação DEVE funcionar sem estado inválido
- QUANDO o side menu é aberto e há apenas um volume ENTÃO DEVE informar isso, em vez de mostrar lista vazia

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| LIB-01 | Rotas — URL canônica e limites | 2B | Done (T1/T3/T4/T6/T7) |
| LIB-02 | Rotas — histórico e navegação do navegador | 2B | Done (T5) |
| LIB-03 | Rotas — capítulo e link público | 2B | Done (T2/T6/T7) |
| LIB-04 | Estante — listagem e estados | 2B | Done (T8/T9) |
| LIB-05 | Estante — só `BookSummary` | 2B | Done (T8) |
| LIB-06 | Side menu — lombadas e troca | 2B | Done (T10) |
| LIB-07 | A11y — foco e `aria-hidden` | 2B | Done (T11/T12/T13/T14) |
| LIB-08 | A11y — ordem de leitura e alvo de toque | 2B | Done (T13/T14) |

**Cobertura:** 8 requisitos implementados. Offline: 218 testes verdes. Preview: estante→
leitor→URL sync→voltar OK. A11y visual (contraste/44px) verificada no preview. Validação
independente pendente.

---

## Success Criteria

- [ ] Ler um volume inteiro só com teclado, com foco sempre visível
- [ ] Voltar do navegador funciona depois de folhear 40 páginas
- [ ] Estante com 30 volumes carrega sem buscar nenhum documento completo
- [ ] `/s/:token` em janela anônima não tem nenhum controle de edição no DOM
- [ ] Nenhuma conversão página↔folha fora de `src/book/units.ts`
