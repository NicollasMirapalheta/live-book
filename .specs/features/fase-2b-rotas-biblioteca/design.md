# Fase 2B — Rotas e biblioteca · Design

**Spec**: `.specs/features/fase-2b-rotas-biblioteca/spec.md`
**Status**: Draft
**Pré-requisito**: Fase 2A concluída ✅

> Esta fase **liga** a camada de dados (2A) ao app: hoje `App.tsx` renderiza o `demoDoc`;
> ao fim, rotas carregam volumes reais pelo adapter. Também paga a dívida `AD-026`
> (`loadForRender` no caminho de carga) e corrige o defeito de a11y do motor (`AD-019`).

## Decisões desta sessão (confirmadas com o autor)

- **A11y profunda** (folhas fora do spread viram `inert`): escolhida por entregar de fato o
  goal "navegável por teclado". Custo contido — deriva das props existentes do `Leaf`, sem
  tocar geometria. Autoriza-se por `AD-027` (exceção aditiva pontual ao `AD-022`).
- **Entrega inteira** com fases internas (rotas → estante → side menu → a11y).

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph router["react-router v6 (src/routes/)"]
        SHELF["/  ShelfRoute"]
        NEW["/new  NewBookRoute"]
        READ["/b/:id[/p/:n | /c/:slug]  ReaderRoute"]
        SHARE["/s/:token  ReaderRoute (público)"]
        NF["* NotFoundRoute"]
    end

    SHELF -->|listBooks(): BookSummary[]| ADW["pickAdapter()"]
    NEW -->|createBook + editTokens + link de resgate| ADW
    READ -->|getBook → loadForRender → renderPages| ADW
    SHARE -->|getBook (read-only)| PUB["PublicAdapter(supabase read)"]

    READ --> WRAP["ReaderShell: URL↔leaf via units.ts"]
    WRAP -->|children + apiRef + onLeafChange| LB["<LiveBook> (motor)"]
    WRAP --> SIDE["SideMenu (irmão do motor, src/ui/)"]

    LB -. onLeafChange(leaf) .-> WRAP
    WRAP -. apiRef.goTo(leaf) .-> LB
```

**O motor permanece o motor.** A tradução URL (número impresso) ↔ folha (`leaf`) mora no
`ReaderShell`, usando **só** `src/book/units.ts` (`AD-010`). O motor expõe o que basta:
`initialLeaf`, `onLeafChange`, e a `LiveBookApi` (`goTo`/`getLeaf`/`leaves`) — tudo já existe
da Fase 1. As únicas mudanças em `src/live-book/` são a correção de a11y (`AD-019`/`AD-027`).

---

## Code Reuse Analysis

| Componente | Local | Como usar |
|---|---|---|
| `StorageAdapter` / `pickAdapter` / `PublicAdapter` | `src/data/` | fonte dos volumes; `canWrite` decide o cromo de edição |
| `loadForRender` | `src/book/loadDoc.ts` | **paga `AD-026`**: `getBook` cru → migrate → sanitize antes de `renderPages` |
| `renderPages` / `getSurface` / `themeToVars` | `src/book/` | doc → `ReactElement<PageProps>[]` para o `<LiveBook>` (mesma ponte do `App.tsx` atual) |
| unidades | `src/book/units.ts` | `leafOfPageNumber`, `pageNumberOfFace`, `faceOfPageNumber` — a tradução URL↔motor |
| `LiveBookApi` / `onLeafChange` / `initialLeaf` | `src/live-book/` | navegação imperativa e sincronização de URL, sem o motor conhecer rota |
| `editTokens` | `src/data/editTokens.ts` | `NewBookRoute` guarda o token e exibe o link de resgate (`AD-017`) |
| custom properties `--lb-*` + Fraunces/Inter | `live-book.css` / design system | estante e side menu (`AD-015`): sem paleta nova |

### Integration Points

| Sistema | Método |
|---|---|
| `<LiveBook>` | `ReaderShell` passa `children`(=`renderPages`), `initialLeaf`, `onLeafChange`, `apiRef`, `style`; nunca um `if (surface)` |
| Adapter | rotas de escrita/leitura por `pickAdapter()`; `/s/:token` por `PublicAdapter` |
| Auth (dormente) | nenhum; `owner_id`/`claim_book` seguem inertes |

---

## Components

### `AppRouter` + `main.tsx`
- **Purpose**: monta o `BrowserRouter` e a tabela de rotas; substitui o `App.tsx` atual (que fixava o `demoDoc`).
- **Location**: `src/routes/AppRouter.tsx`, `src/main.tsx` (liga o router)
- **Dependencies**: `react-router-dom` v6 (`AD-020`).

### `ReaderShell` (o tradutor URL↔motor)
- **Purpose**: carrega o volume, monta o `<LiveBook>`, e mantém URL e `leaf` em sincronia.
- **Location**: `src/routes/ReaderRoute.tsx` (+ `ReaderShell` interno)
- **Interfaces / comportamento**:
  - Recebe `adapter` e `id` (ou token). `getBook(id)` → `loadForRender` → `renderPages`.
  - Abre em `initialLeaf = leafOfPageNumber(asPageNumber(clamp(n)))`.
  - `onLeafChange(leaf)` → deriva o número impresso (`pageNumberOfFace(faceOfPageNumber…)`) e `navigate('/b/:id/p/:n', { replace: true })` (`AD-020`).
  - Back/forward do navegador → `useParams` muda → `apiRef.goTo` para a folha, **só se diferente** (guarda contra laço URL→goTo→onLeafChange→URL).
  - `/c/:slug` → resolve capítulo (ver `chapterSlugs`) → `navigate('/b/:id/p/:n', { replace:true })`.
  - `canWrite=false` (público) → não renderiza toolbar/edição alguma no DOM (LIB-01 AC6).
- **Reuses**: `loadForRender`, `renderPages`, `units`, `LiveBookApi`.

### `chapterSlugs`
- **Purpose**: mapa determinístico `slug → PageNumber` a partir dos capítulos do doc.
- **Location**: `src/book/chapters.ts`
- **Interfaces**: `chapterSlugs(doc): Array<{ slug, page: PageNumber, label }>`; slug por `slugify(label)`, **primeiro vence** em colisão (edge case). Página via `units`.
- **Dependencies**: `schema` (páginas com `chapter`), `units`.

### `ShelfRoute` + `Shelf` + `ShelfCard`
- **Purpose**: home; lista volumes (capa, título, metadados), com estados vazio/carregando (LIB-04).
- **Location**: `src/routes/ShelfRoute.tsx`, `src/ui/Shelf.tsx`, `src/ui/ShelfCard.tsx`
- **Interfaces**: `adapter.listBooks(): BookSummary[]` — **nunca** `getBook` (LIB-05, invariante 6). Capa usa o gradiente da surface (imagens são Fase 3). Cartão é `<a href="/b/:id">` com foco visível.
- **Reuses**: `themeToVars`/`getSurface` para o gradiente da capa; design system.

### `NewBookRoute`
- **Purpose**: cria um volume e exibe o **link de resgate uma vez** (`AD-017`).
- **Location**: `src/routes/NewBookRoute.tsx`
- **Interfaces**: escolhe preset de surface → `createEmptyDoc` → `adapter.createBook` → `setEditToken` + mostra `encodeRescue(id, token)` uma vez → navega para `/b/:id`. (Autoria real é Fase 4.)
- **Reuses**: `factory.createEmptyDoc`, `editTokens`.

### `SideMenu`
- **Purpose**: pilha de lombadas dos demais volumes; hover/foco revela a capa; troca sem recarregar; atual marcado (LIB-06).
- **Location**: `src/ui/SideMenu.tsx` — **fora de `src/live-book/`**, irmão do motor (LIB-06 AC5).
- **Interfaces**: `listBooks()`; ao acionar, `navigate('/b/:id')` (troca por rota, sem reload). Acima de ~12, rola. Um volume só → informa, não lista vazio (edge case).

### A11y do motor (`AD-019` + `AD-027`)
- **Location**: `src/live-book/LiveBook.tsx` (aditivo, autorizado por `AD-019`), `src/live-book/Leaf.tsx` (só `inert`, `AD-027`), CSS de foco/toque em arquivo **não-geométrico**.
- **Mudanças**:
  1. `lb-tabs`: remover `aria-hidden`, dar `aria-label` a cada fita (LIB-07 AC1). Os botões deixam de ser focáveis dentro de subárvore escondida.
  2. `Leaf`: `inert` na folha quando **não** é o spread — derivado de `!(curlNext||curlPrev||coverNext||coverPrev)`. Tira do tab order o conteúdo ocluído das folhas adjacentes (LIB-07 AC1/AC3). Face virada já sai por `visibility:hidden`.
  3. Efeito em `LiveBook` sobre `leaf`: se o foco está numa folha que vai desmontar, move para uma âncora estável (nav) — LIB-07 AC3.
  4. Ordem de leitura: DOM já é folha `leaf-1` (esquerda) antes de `leaf` (direita) → esquerda-depois-direita (LIB-08 AC4); confirmar por teste.
  5. CSS: `:focus-visible` com contraste (LIB-07 AC2); alvos de toque ≥44×44 nas fitas/nav (LIB-08 AC5).
- **Rede**: a caracterização da Fase 0 DEVE seguir verde (LIB-07 AC6).

---

## Data Models

```typescript
// Parâmetros de rota (react-router)
type ReaderParams = { id: string; page?: string; slug?: string };  // /b/:id, /p/:n, /c/:slug
type ShareParams  = { token: string };                             // /s/:token  (token = id do volume; o uuid é o segredo, AD-004/013)

// Slug de capítulo
interface ChapterSlug { slug: string; page: PageNumber; label: string }
```

**Sobre `/s/:token`**: a v1 não tem coluna de share-token separada — `visibility='link'` + uuid
tornam o volume legível por quem tem o id (o uuid **é** o segredo, `AD-004`). Então `:token` é
o id do volume, lido via `PublicAdapter` (sobre a leitura Supabase de `books_public`).
Compartilhamento pressupõe o adapter Supabase; no modo offline (Local) não há o que compartilhar.

---

## Error Handling Strategy

| Cenário | Tratamento | Usuário vê |
|---|---|---|
| `/b/:id` com id inexistente/apagado | `getBook` → `null` | "não encontrado" + caminho de volta à estante (edge case) |
| `:n` fora do intervalo | clamp para `[1, maxPage]` via `units` | abre na posição válida mais próxima, sem erro (LIB-01 AC5) |
| `/c/:slug` inexistente | resolve para a 1ª página | abre no começo, sem erro (edge case) |
| slug duplicado | primeiro capítulo vence (determinístico) | posição estável (edge case) |
| URL de página não numerada (capa) | cai na posição válida mais próxima | sem estado inválido (edge case) |
| listagem carregando / vazia | estado de carregamento / vazio-com-ação | nunca tela em branco (LIB-04 AC2/AC3) |
| backend pausado | `StorageUnavailableError` → estado de carregando | carregando, não erro (herdado da 2A) |

---

## Risks & Concerns

| Concern | Local | Impacto | Mitigação |
|---|---|---|---|
| **Laço de sincronização** URL→`goTo`→`onLeafChange`→URL | `ReaderShell` | folhear empilha history ou entra em loop | `navigate(..., {replace:true})` sempre; `goTo` só quando o alvo difere do `leaf` atual; comparar antes de navegar |
| **A11y vs performance** do motor | `Leaf.tsx` (`AD-027`) | regressão no motor afinado | `inert` derivado de props que já mudam por virada (sem re-render/`MotionValue` novo); caracterização Fase 0 é gate (LIB-07 AC6) |
| **`loadForRender` esquecido** (dívida `AD-026`) | `ReaderRoute` | HTML da rede ao render sem sanitizar = XSS armazenado | `ReaderRoute` é o **único** caminho de carga; teste garante que o doc renderizado passou por `sanitizeDoc` |
| **Cromo de edição vazando no público** | `/s/:token` | edição num link só-leitura | `canWrite` é a única chave; nenhum `if(surface)`; teste assegura DOM sem controle de edição (LIB-01 AC6) |
| **Estante carregando `BookDoc`** | `ShelfRoute` | 40 docs de 180 KB para desenhar capas | só `listBooks()`/`BookSummary`; teste assegura que nenhum `getBook` é chamado na montagem (LIB-05) |
| **Conversão página↔folha reimplementada** | rotas | volta do bug histórico | tudo por `units.ts`; teste tabelado cobre limites e ida-volta |

---

## Tech Decisions (não óbvias)

| Decisão | Escolha | Racional |
|---|---|---|
| Sincronização URL↔motor | no `ReaderShell`, via `units` + `onLeafChange`/`apiRef` | motor não conhece rota; `AD-009`/`AD-010` |
| `/s/:token` | `token` = id do volume, `PublicAdapter` sobre leitura Supabase | v1 não tem share-token separado; o uuid é o segredo (`AD-004/013`) |
| A11y de folha ocluída | `inert` derivado, dentro de `Leaf.tsx` | `visibility:hidden` só cobre a face virada; `inert` cobre a folha ocluída → `AD-027` |
| Capa na estante | gradiente da surface | imagens/capa real são Fase 3 (Out of Scope) |
| `/new` sem editor | cria + link de resgate + vai pro leitor | editor é Fase 4; `/new` paga a dívida do resgate (`AD-017`) |

> **Decisões de nível de projeto** promovidas: `AD-027` (exceção `inert` em `Leaf.tsx`).

---

## Requirement Traceability (design → componentes)

| ID | Requisito | Componentes |
|---|---|---|
| LIB-01 | Rotas — URL canônica e limites | `AppRouter`, `ReaderShell` (clamp, `initialLeaf`) |
| LIB-02 | Histórico e navegação do navegador | `ReaderShell` (`replace`, back/forward → `goTo`) |
| LIB-03 | Capítulo e link público | `chapterSlugs`, `ReaderRoute` público (`PublicAdapter`) |
| LIB-04 | Estante — listagem e estados | `ShelfRoute`, `Shelf`, `ShelfCard` |
| LIB-05 | Estante — só `BookSummary` | `ShelfRoute` (`listBooks`, nunca `getBook`) |
| LIB-06 | Side menu — lombadas e troca | `SideMenu` (irmão do motor) |
| LIB-07 | A11y — foco e `aria-hidden` | `LiveBook.tsx` (lb-tabs, efeito de foco), `Leaf.tsx` (`inert`), CSS `:focus-visible` |
| LIB-08 | A11y — ordem de leitura e alvo de toque | ordem DOM do spread, CSS 44px |

---

## Success Criteria (do design)

- [ ] Ler um volume inteiro só com teclado, foco sempre visível, sem cair em conteúdo ocluído
- [ ] Voltar do navegador funciona após folhear 40 páginas (sempre `replace`)
- [ ] Estante com 30 volumes sem nenhum `getBook`
- [ ] `/s/:token` sem nenhum controle de edição no DOM
- [ ] Nenhuma conversão página↔folha fora de `units.ts`
- [ ] Caracterização da Fase 0 verde após a a11y (LIB-07 AC6)
- [ ] O doc renderizado no `ReaderRoute` passou por `loadForRender` (dívida `AD-026` paga)
