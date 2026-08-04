# Fase 2B — Rotas e biblioteca · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo
Execute e as Critical Rules dela.** A skill é a fonte de verdade do fluxo (ciclo por task,
delegação a sub-agentes, revisão de adequação, Verifier, sensor de discriminação).

**Se a skill não puder ser ativada, PARE e avise o usuário.**

---

**Design**: `.specs/features/fase-2b-rotas-biblioteca/design.md`
**Status**: Done — 15/15 tasks. Offline: 218 verdes + 2 skip. Preview OK. Verifier pendente.

---

## Test Coverage Matrix

> Diretrizes: `CLAUDE.md`, `docs/testing/strategy.md` (L1–L5, `AD-016`), `vitest.config.ts`.
> Amostra: `src/live-book/__tests__/*` (caracterização), `src/book/**/__tests__/*` (unit),
> `src/data/**/__tests__/*` (contrato). Base atual: 152 testes verdes.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Função pura (`chapterSlugs`, `readerUrl`) | unit | Todos os ramos; 1:1 com AC; toda edge case (clamp, colisão de slug, ida-volta) | `src/**/__tests__/*.test.ts` | `npm test` |
| Componente/rota (`ReaderShell`, rotas, `Shelf`, `ShelfCard`, `SideMenu`, `NewBookRoute`) | component (RTL+jsdom) | Happy + cada edge + cada caminho de erro; asserção de comportamento, não de mock | `src/**/__tests__/*.test.tsx` | `npm test` |
| A11y do motor (edições em `LiveBook.tsx`/`Leaf.tsx`) | component (RTL) | Estrutural: nenhum focável sob `aria-hidden`; `inert` fora do spread; foco não fica em folha desmontada; ordem esquerda→direita. **Caracterização da Fase 0 permanece verde** | `src/live-book/__tests__/*.test.tsx` | `npm test` |
| A11y visual (contraste de `:focus-visible`, alvo 44×44) | none automatizável | jsdom não faz layout/paint → verificação no **preview/manual** (registrada, não asserida falsamente) | — | preview + revisão de CSS |
| E2E / visual / retrato (Playwright, L5) | **deferido** | Ambiente: `npm run shots` quebrado e Playwright não fiado como runner. Success criteria cobertos por componente/integração onde jsdom permite; jornada visual fica manual | — | (fora do gate automatizado) |
| Wiring / config (`main.tsx`, install, CSS) | none | Gate de build + verificação no preview | `src/main.tsx` | build gate + preview |

**Nota de gate honesto:** o `npm test` cobre unit + componente + a a11y estrutural + toda a
caracterização da Fase 0 (LIB-07 AC6). A a11y **visual** (LIB-07 AC2, LIB-08 AC5) e a jornada
E2E não rodam em jsdom — são verificadas no preview do harness durante o Execute e anotadas
como lacunas de precisão, nunca asseridas com valor falso.

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | Após tasks com unit/componente | `npm test` |
| Full | Igual ao Quick nesta fase (E2E deferido) | `npm test` |
| Build | Fim de fase / config / CSS / wiring | `npm run typecheck && npm run build && npm test` |
| Preview | Tasks observáveis no navegador (wiring, a11y visual) | preview do harness + `read_console_messages`/`computer` |

---

## Execution Plan

### Phase 1: Fundação de rotas + carga

```
T1 → T2 → T3
```

### Phase 2: Leitor

```
T4 → T5 → T6 → T7
```

### Phase 3: Biblioteca

```
T8 → T9 → T10
```

### Phase 4: A11y do motor

```
T11 → T12 → T13 → T14
```

### Phase 5: Ligar o app

```
T15
```

---

## Task Breakdown

### T1: Router e casca de rotas

**What**: instalar `react-router-dom` v6; `AppRouter` com a tabela de rotas e `NotFoundRoute`; placeholders para as demais.
**Where**: `src/routes/AppRouter.tsx`, `src/routes/NotFoundRoute.tsx`
**Depends on**: None
**Reuses**: —
**Requirement**: LIB-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Rota desconhecida (`*`) renderiza "não encontrado" com link para a estante
- [ ] As rotas conhecidas resolvem para seus componentes (placeholders por ora)
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T2: Slugs de capítulo

**What**: `chapterSlugs(doc)` — mapa determinístico `slug → PageNumber` dos capítulos; primeiro vence em colisão; página via `units`.
**Where**: `src/book/chapters.ts`
**Depends on**: None
**Reuses**: `src/book/units.ts`, `schema`
**Requirement**: LIB-03

**Done when**:
- [ ] Slug estável por `slugify(label)`; colisão → primeiro capítulo vence (edge case)
- [ ] `PageNumber` correto por capítulo (via `units`)
- [ ] slug inexistente resolvido pelo chamador para a 1ª página (contrato documentado)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T3: Helpers de URL do leitor

**What**: `readerUrl.ts` — `leafForPage(n, maxPage)` com clamp, `pageForLeaf(leaf)` para o número impresso; conversões só por `units`.
**Where**: `src/routes/readerUrl.ts`
**Depends on**: None
**Reuses**: `src/book/units.ts`
**Requirement**: LIB-01

**Done when**:
- [ ] `:n` fora do intervalo é limitado a `[1, maxPage]` sem erro (LIB-01 AC5)
- [ ] Página não numerada (capa) cai na posição válida mais próxima (edge case)
- [ ] Ida-volta `pageForLeaf(leafForPage(n)) === n` no miolo
- [ ] Nenhuma conversão fora de `units`
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T4: ReaderShell — carga e montagem

**What**: `ReaderShell` carrega `adapter.getBook(id)` → **`loadForRender`** → `renderPages` → monta `<LiveBook>` abrindo em `initialLeaf` da URL. Estados carregando/não-encontrado.
**Where**: `src/routes/ReaderRoute.tsx`
**Depends on**: T1, T3
**Reuses**: `loadForRender`, `renderPages`, `getSurface`/`themeToVars`, `LiveBookApi`
**Requirement**: LIB-01, DATA-09 (dívida `AD-026`)

**Done when**:
- [ ] Um volume carrega e abre na página `:n` (LIB-01 AC1)
- [ ] O doc renderizado passou por `loadForRender` (script num bloco não é executado — paga `AD-026`)
- [ ] id inexistente → "não encontrado" com volta à estante (edge case)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T5: Sincronização URL ↔ motor

**What**: `onLeafChange` → `navigate('/b/:id/p/:n', { replace:true })`; mudança de `:n` na URL → `apiRef.goTo`, só quando difere (guarda anti-laço).
**Where**: `src/routes/ReaderRoute.tsx` (modifica)
**Depends on**: T4
**Reuses**: `units`, `LiveBookApi`
**Requirement**: LIB-02

**Done when**:
- [ ] Virar a página **substitui** a entrada de histórico (LIB-02 AC2)
- [ ] Back/forward do navegador leva o livro à posição correspondente (LIB-02 AC3)
- [ ] Sem laço URL→goTo→onLeafChange→URL (comparação antes de navegar/goTo)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T6: Rotas de página, capítulo e limites

**What**: liga `/b/:id`, `/b/:id/p/:n`, `/b/:id/c/:slug` (resolve via `chapterSlugs` → redirect `replace` para `/p/:n`); clamp de `:n`.
**Where**: `src/routes/ReaderRoute.tsx` (modifica), `AppRouter`
**Depends on**: T4, T5, T2
**Reuses**: `chapterSlugs`, `readerUrl`
**Requirement**: LIB-01, LIB-03

**Done when**:
- [ ] `/c/:slug` resolve e redireciona para a URL canônica de página (LIB-01 AC4)
- [ ] slug inexistente → 1ª página, sem erro (edge case)
- [ ] `:n` fora do intervalo → clamp (LIB-01 AC5)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T7: Leitor público `/s/:token`

**What**: rota `/s/:token` monta o `ReaderShell` com `PublicAdapter` (sobre a leitura Supabase); `canWrite=false` → **nenhum** controle de edição no DOM.
**Where**: `src/routes/ShareRoute.tsx`, `AppRouter`
**Depends on**: T6
**Reuses**: `PublicAdapter`, `ReaderShell`
**Requirement**: LIB-01 (AC6), LIB-03

**Done when**:
- [ ] `/s/:token` abre em leitura (LIB-01 AC6)
- [ ] Nenhum controle de edição presente no DOM quando `canWrite=false`
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T8: Estante (home)

**What**: `ShelfRoute` + `Shelf` + `ShelfCard` — lista `BookSummary` com capa (gradiente da surface), título, metadados; estados vazio/carregando; cartão é link com foco visível.
**Where**: `src/routes/ShelfRoute.tsx`, `src/ui/Shelf.tsx`, `src/ui/ShelfCard.tsx`
**Depends on**: T1
**Reuses**: `adapter.listBooks`, `getSurface`/`themeToVars`, design system
**Requirement**: LIB-04, LIB-05

**Done when**:
- [ ] Lista volumes com capa/título/metadados (LIB-04 AC1)
- [ ] Estado vazio com ação de criar (LIB-04 AC2); estado de carregamento (AC3)
- [ ] **Nenhum `getBook`** é chamado na montagem (LIB-05 AC5) — verificado por spy no adapter
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T9: Criar volume + link de resgate

**What**: `NewBookRoute` — escolhe preset de surface → `createEmptyDoc` → `adapter.createBook` → `setEditToken` + exibe `encodeRescue(id, token)` **uma vez** → navega para `/b/:id`.
**Where**: `src/routes/NewBookRoute.tsx`
**Depends on**: T1
**Reuses**: `factory.createEmptyDoc`, `editTokens`
**Requirement**: LIB-04, DATA-06 (`AD-017`)

**Done when**:
- [ ] Cria o volume e guarda o `editToken` (DATA-06)
- [ ] Exibe o link de resgate uma vez, com instrução de guardá-lo fora do navegador (`AD-017`)
- [ ] Navega para o volume criado
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T10: Side menu de troca rápida

**What**: `SideMenu` — pilha de lombadas dos demais volumes; hover/foco revela a capa; acionar troca por rota sem reload; atual marcado; um volume só informa.
**Where**: `src/ui/SideMenu.tsx`
**Depends on**: T1, T8
**Reuses**: `adapter.listBooks`, design system
**Requirement**: LIB-06

**Done when**:
- [ ] Lista os demais volumes como lombadas; o atual marcado (LIB-06 AC1/AC4)
- [ ] Acionar troca de volume por rota, sem recarregar a página (LIB-06 AC3)
- [ ] Fica **fora** de `src/live-book/` (LIB-06 AC5)
- [ ] Um volume só → informa, não lista vazio (edge case)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T11: A11y — `lb-tabs` fora do `aria-hidden`

**What**: remover `aria-hidden` do `lb-tabs` e dar `aria-label` a cada fita; mudança aditiva autorizada por `AD-019`. Não tocar `toc`/`faces`.
**Where**: `src/live-book/LiveBook.tsx` (modifica; só a região `lb-tabs`)
**Depends on**: None
**Reuses**: —
**Requirement**: LIB-07 (AC1)

**Done when**:
- [ ] Nenhum elemento focável dentro de subárvore `aria-hidden` (LIB-07 AC1) — verificado por consulta ao DOM
- [ ] Caracterização da Fase 0 permanece verde (LIB-07 AC6)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T12: A11y — `inert` nas folhas fora do spread

**What**: em `Leaf.tsx`, marcar a folha como `inert` quando **não** é o spread (`!(curlNext||curlPrev||coverNext||coverPrev)`), tirando conteúdo ocluído do tab order. Única mudança autorizada em `Leaf.tsx` (`AD-027`).
**Where**: `src/live-book/Leaf.tsx` (modifica)
**Depends on**: None
**Reuses**: props existentes do `Leaf`
**Requirement**: LIB-07 (AC1/AC3), `AD-027`

**Done when**:
- [ ] Folha fora do spread recebe o atributo `inert`; folhas do spread não (verificado no DOM)
- [ ] Caracterização da Fase 0 permanece verde (LIB-07 AC6)
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T13: A11y — foco na virada e ordem de leitura

**What**: efeito em `LiveBook` sobre `leaf`: se o foco está numa folha que vai desmontar, move para uma âncora estável (nav). Confirmar ordem de leitura esquerda→direita do spread.
**Where**: `src/live-book/LiveBook.tsx` (modifica; efeito aditivo)
**Depends on**: T11
**Reuses**: `LiveBookApi`/refs internos
**Requirement**: LIB-07 (AC3), LIB-08 (AC4)

**Done when**:
- [ ] Ao virar, o foco não permanece numa folha desmontada (LIB-07 AC3)
- [ ] A ordem de leitura do spread é página esquerda depois direita (LIB-08 AC4)
- [ ] Caracterização da Fase 0 permanece verde
- [ ] Gate `npm test` passa
- [ ] Commit atômico

**Tests**: component · **Gate**: quick

---

### T14: A11y visual — foco e alvo de toque

**What**: CSS de `:focus-visible` com contraste suficiente e alvos de toque ≥44×44 px nas fitas/nav; em arquivo **não-geométrico**.
**Where**: `src/live-book/prose.css` ou `src/ui/a11y.css` (não a geometria de `live-book.css`)
**Depends on**: T11, T12
**Reuses**: custom properties `--lb-*`
**Requirement**: LIB-07 (AC2), LIB-08 (AC5)

**Done when**:
- [ ] Indicador de foco visível com contraste (LIB-07 AC2) — verificado no **preview**
- [ ] Alvo de toque ≥44×44 nos controles (LIB-08 AC5) — verificado no **preview** (jsdom não mede layout)
- [ ] Gate build passa; verificação registrada no preview
- [ ] Commit atômico

**Tests**: none (visual; preview) · **Gate**: build + preview

---

### T15: Ligar o app às rotas

**What**: `main.tsx` monta o `AppRouter` (aposenta o `demoDoc` fixo no `App.tsx`); semear o `demoDoc` no `LocalAdapter` no primeiro boot offline, para a estante ter conteúdo em dev.
**Where**: `src/main.tsx`, `src/App.tsx` (remove/retira), `src/data/seed.ts` (seed dev)
**Depends on**: T6, T7, T8, T9, T10
**Reuses**: `AppRouter`, `pickAdapter`, `demoDoc`
**Requirement**: LIB-01..06 (integração)

**Done when**:
- [ ] O app sobe na estante; navegar para um volume e voltar funciona
- [ ] `npm run typecheck && npm run build && npm test` verdes
- [ ] Verificado no **preview**: estante → leitor → voltar, sem erro de console
- [ ] Commit atômico

**Tests**: none (wiring; preview) · **Gate**: build + preview

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7
Phase 3:  T8 ──→ T9 ──→ T10
Phase 4:  T11 ─→ T12 ─→ T13 ─→ T14
Phase 5:  T15
```

15 tasks → ~2–3 batches (~7/worker) → **oferta de sub-agentes no Execute**.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1 router+404 | 2 componentes coesos | ✅ |
| T2 chapterSlugs | 1 função | ✅ |
| T3 readerUrl | 1 módulo de helpers | ✅ |
| T4 ReaderShell carga | 1 componente | ✅ |
| T5 sync URL | 1 comportamento no ReaderShell | ✅ |
| T6 rotas/capítulo | ligação de rotas | ✅ |
| T7 público | 1 rota | ✅ |
| T8 estante | 1 rota + 2 componentes coesos | ✅ |
| T9 novo+resgate | 1 rota | ✅ |
| T10 side menu | 1 componente | ✅ |
| T11 lb-tabs a11y | 1 região JSX | ✅ |
| T12 inert | 1 atributo derivado | ✅ |
| T13 foco/ordem | 1 efeito + assertção | ✅ |
| T14 CSS a11y | 1 folha de estilo | ✅ |
| T15 wiring | ligação do app | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
|---|---|---|---|
| T1 | None | início P1 | ✅ |
| T2 | None | P1 | ✅ |
| T3 | None | P1 | ✅ |
| T4 | T1, T3 | início P2 (fases anteriores) | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T4, T5, T2 | T5→T6 (T4/T2 anteriores) | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T1 | início P3 (T1 anterior) | ✅ |
| T9 | T1 | P3 | ✅ |
| T10 | T1, T8 | T8→…→T10 | ✅ |
| T11 | None | início P4 | ✅ |
| T12 | None | P4 | ✅ |
| T13 | T11 | T11→…→T13 | ✅ |
| T14 | T11, T12 | T12→…→T14 | ✅ |
| T15 | T6, T7, T8, T9, T10 | início P5 (fases anteriores) | ✅ |

> Todas as dependências apontam para trás ou dentro da fase.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | componente/rota | component | component | ✅ |
| T2 | função pura | unit | unit | ✅ |
| T3 | função pura | unit | unit | ✅ |
| T4 | componente/rota | component | component | ✅ |
| T5 | componente/rota | component | component | ✅ |
| T6 | componente/rota | component | component | ✅ |
| T7 | componente/rota | component | component | ✅ |
| T8 | componente/rota | component | component | ✅ |
| T9 | componente/rota | component | component | ✅ |
| T10 | componente | component | component | ✅ |
| T11 | a11y do motor | component | component | ✅ |
| T12 | a11y do motor | component | component | ✅ |
| T13 | a11y do motor | component | component | ✅ |
| T14 | a11y visual | none (preview) | none | ✅ (jsdom não mede layout; verificação no preview) |
| T15 | wiring | none (preview) | none | ✅ (build + preview) |
