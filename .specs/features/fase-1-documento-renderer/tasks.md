# Fase 1 — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome** e siga o fluxo
Execute e as Critical Rules dela.

**Se a skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

---

**Spec**: `.specs/features/fase-1-documento-renderer/spec.md`
**Design**: `.specs/features/fase-1-documento-renderer/design.md`
**Status**: Draft
**Pré-requisito**: Fase 0 concluída (`npm run test` verde, `units.ts` existindo)

---

## Test Coverage Matrix

> Diretrizes: `CLAUDE.md`, `docs/testing/strategy.md`, `AD-016`. Stack confirmada com o
> usuário: Vitest nesta fase, Playwright a partir da Fase 3.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
|---|---|---|---|---|
| Tipos e schema | none | apenas gate de build | `src/book/schema.ts` | `npm run typecheck && npm run build` |
| Função pura de domínio | unit | 1:1 com os AC; **todos** os casos de borda da spec | `src/book/__tests__/*.test.ts` | `npm run test` |
| Registry de surfaces | unit | todos os AC de DOC-07, incluindo o fallback | `src/book/surfaces/__tests__/*.test.ts` | `npm run test` |
| Componente de bloco | unit (render) | cada bloco renderiza seu HTML; AC de DOC-05 e DOC-06 | `src/book/blocks/__tests__/*.test.tsx` | `npm run test` |
| Integração documento → motor | unit (render) | AC de DOC-09 | `src/book/__tests__/integration.test.tsx` | `npm run test` |
| Motor (mudanças aditivas) | unit (render) | AC de DOC-10 + **toda a caracterização da Fase 0 continua verde** | `src/live-book/__tests__/*.test.tsx` | `npm run test` |
| CSS | none | verificação visual manual (`shots` está quebrado) | `src/book/blocks/blocks.css` | — |

## Gate Check Commands

| Nível | Quando usar | Comando |
|---|---|---|
| Quick | após task com testes unitários | `npm run test` |
| Full | *(não se aplica — sem e2e antes da Fase 3)* | — |
| Build | fim de fase, ou task só de tipos/CSS | `npm run typecheck && npm run build && npm run test` |

---

## Execution Plan

### Phase 1: Modelo de documento

```
T1 ─┬→ T2
    ├→ T3
    └→ (T4, T8)
```

### Phase 2: Registry e blocos

```
T4 ─┬→ T5
    ├→ T6
    └→ T7
```

### Phase 3: Renderer

```
T8 → T9 → T10
```

### Phase 4: Surface e integração

```
T11 → T12 → T13 → T14
```

---

## Task Breakdown

### T1: Definir o schema do documento

**What**: tipos do `BookDoc`, união discriminada de blocos e `SCHEMA_VERSION`.
**Where**: `src/book/schema.ts`
**Depends on**: None
**Reuses**: `PageTone` alinhado com `src/live-book/types.ts`
**Requirement**: DOC-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `BookDoc`, `BookPage`, `CoverSpec`, `BookTheme`, `AssetRef` e `SurfaceId` exportados
- [ ] Oito blocos de núcleo como união discriminada por `type`
- [ ] `UnknownBlock` permite `type: string` com campos arbitrários preservados
- [ ] `SCHEMA_VERSION` exportado como constante
- [ ] O arquivo **não importa React nem nada de `src/live-book/`**
- [ ] Gate: `npm run typecheck && npm run build && npm run test`

**Tests**: none · **Gate**: build
**Commit**: `feat(book): definir schema do documento`

---

### T2: Criar fábricas de documento

**What**: construtores de documento, página e bloco, com ids estáveis.
**Where**: `src/book/factory.ts`, `src/book/__tests__/factory.test.ts`
**Depends on**: T1
**Requirement**: DOC-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `createEmptyDoc`, `createPage` e `createBlock` implementadas
- [ ] Ids gerados com `crypto.randomUUID`, únicos entre chamadas
- [ ] `createEmptyDoc` produz documento que passa em `migrateDoc` sem alteração
- [ ] Borda coberta: documento com `pages: []` é válido
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 5 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar fábricas de documento`

---

### T3: Implementar migração de schema

**What**: `migrateDoc` com cadeia de versões e preservação de bloco desconhecido.
**Where**: `src/book/migrate.ts`, `src/book/__tests__/migrate.test.ts`
**Depends on**: T1
**Requirement**: DOC-01, DOC-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `migrateDoc(raw): { doc, readOnly }` conforme o design
- [ ] Documento sem `schemaVersion` lança erro descritivo
- [ ] Documento com versão futura devolve `readOnly: true`
- [ ] Documento na versão corrente volta inalterado (idempotente)
- [ ] **Bloco com `type` inventado sobrevive ao ciclo `migrateDoc` → `JSON.stringify` → `JSON.parse`** com todos os seus campos
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 7 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar migração de schema`

---

### T4: Criar registry de surfaces

**What**: registro, resolução e tabela de blocos memoizada por surface.
**Where**: `src/book/surfaces/registry.ts`, `src/book/surfaces/__tests__/registry.test.ts`
**Depends on**: T1
**Requirement**: DOC-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `registerSurface`, `getSurface`, `listSurfaces` e `blockTableFor` exportados
- [ ] `BlockRenderProps` e `SurfaceDef` definidos conforme o design
- [ ] Surface não registrada devolve fallback com blocos de núcleo e sem tema, **sem lançar**
- [ ] `blockTableFor` memoiza por `surfaceId` — chamadas repetidas devolvem a mesma referência
- [ ] Blocos de núcleo disponíveis para toda surface sem registro
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 6 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar registry de surfaces`

---

### T5: Implementar blocos de texto

**What**: renderers de `heading`, `text` e `quote`.
**Where**: `src/book/blocks/{Heading,Text,Quote}.tsx`, `blocks.css`, `__tests__/text-blocks.test.tsx`
**Depends on**: T4
**Reuses**: custom properties `--lb-*`; `prose.css` como referência de estilo, não dependência
**Requirement**: DOC-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cada bloco renderiza seu HTML com classes `bk-*`
- [ ] `text` renderiza HTML do campo `html` (sem sanitização nesta fase — ver Tech Decisions do design)
- [ ] `heading` respeita `level` 1–3 e `align`
- [ ] Nenhuma cor nova: só custom properties existentes
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 4 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar blocos de texto`

---

### T6: Implementar blocos de estrutura

**What**: renderers de `callout`, `rule` e `spacer`.
**Where**: `src/book/blocks/{Callout,Rule,Spacer}.tsx`, `blocks.css`, `__tests__/structure-blocks.test.tsx`
**Depends on**: T4
**Requirement**: DOC-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cada bloco renderiza com classes `bk-*`
- [ ] `spacer` com `size: "fill"` ocupa o espaço restante da página
- [ ] `callout` respeita `tone`
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 4 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar blocos de estrutura`

---

### T7: Implementar blocos de mídia

**What**: renderers de `image` e `gallery`, consumindo `AssetRef` via `ctx.assetUrl`.
**Where**: `src/book/blocks/{Image,Gallery}.tsx`, `blocks.css`, `__tests__/media-blocks.test.tsx`
**Depends on**: T4
**Requirement**: DOC-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `image` emite `width` e `height` a partir do `AssetRef`, reservando a caixa
- [ ] `image` usa `loading="eager"` e `decoding="async"` — **`lazy` é proibido**, a janela de virtualização já é o lazy loader ([ADR-005](../../../docs/adr/005-orcamento-de-imagem-e-janela-de-virtualizacao.md))
- [ ] `lqip` aplicado como `background-image` no wrapper quando presente
- [ ] `alt` sempre emitido; ausente vira string vazia (decorativa)
- [ ] Borda coberta: `AssetRef` sem `w`/`h` renderiza sem reserva, sem quebrar
- [ ] `gallery` respeita `columns` 2 ou 3
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 6 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar blocos de mídia`

---

### T8: Criar `RenderCtx` e boundary de página

**What**: o tipo de contexto de render e o error boundary que isola a página.
**Where**: `src/book/RenderCtx.ts`, `src/book/PageErrorBoundary.tsx`
**Depends on**: T1
**Requirement**: DOC-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `RenderCtx` definido conforme o design, com `assetUrl` **síncrona**
- [ ] `PageErrorBoundary` é class component com `componentDidCatch`
- [ ] Ao capturar, registra `type` e `id` do bloco quando disponíveis
- [ ] Fallback renderiza página em branco, nunca propaga o erro
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 2 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar contexto de render e boundary de página`

---

### T9: Implementar `PageBody`

**What**: dispatch de blocos pela tabela da surface, dentro do boundary.
**Where**: `src/book/PageBody.tsx`, `src/book/__tests__/PageBody.test.tsx`
**Depends on**: T4, T8
**Requirement**: DOC-05, DOC-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Resolve cada bloco pela tabela de `blockTableFor(surface)`
- [ ] Bloco de `type` não registrado é pulado; o resto da página aparece normalmente
- [ ] Bloco que lança é contido pelo boundary; o teste prova que o irmão anterior continua no DOM
- [ ] `key` de cada bloco é o `block.id`
- [ ] Borda coberta: página com `blocks: []` renderiza em branco sem lançar
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 5 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar dispatch de blocos por página`

---

### T10: Implementar `renderPages`

**What**: a função pura que traduz documento em páginas do motor.
**Where**: `src/book/renderPages.tsx`, `src/book/__tests__/renderPages.test.tsx`
**Depends on**: T9
**Reuses**: `Page` de `src/live-book/index.ts` — **o componente real**, não um equivalente
**Requirement**: DOC-03, DOC-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Devolve exatamente um elemento por página, na ordem de `doc.pages`
- [ ] `chapter`, `title`, `tone` e `hideNumber` chegam ao `<Page>`
- [ ] `key` é o `page.id`
- [ ] **Teste prova que a árvore de blocos não é construída**: com 300 páginas, os elementos devolvidos têm no máximo um filho cada
- [ ] Teste de performance: `renderPages` com 300 páginas executa em menos de 5 ms
- [ ] Duas chamadas com a mesma entrada produzem saída estruturalmente idêntica
- [ ] `renderCover` implementada para `CoverSpec`
- [ ] Borda coberta: `doc.pages` vazio devolve array vazio
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 8 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar renderPages`

---

### T11: Aplicar mudanças aditivas no motor

**What**: props `style` e `apiRef`, e guarda de `contentEditable` no teclado.
**Where**: `src/live-book/LiveBook.tsx`, `src/live-book/types.ts`
**Depends on**: None
**Requirement**: DOC-10

**Tools**: MCP: NONE · Skill: NONE

> ⚠️ O hook `guard-engine.mjs` vai emitir o lembrete do `AD-022`. É esperado: estas são
> exatamente as mudanças aditivas já aprovadas. **Nada além delas.**

**Done when**:
- [ ] `style?: CSSProperties` aplicada no root **depois** de `--lb-cover-square`, sem sobrescrevê-la
- [ ] `apiRef` expõe `goTo`, `leaves` e `getLeaf` via `useImperativeHandle`
- [ ] `LiveBookApi` exportado de `src/live-book/types.ts`
- [ ] Handler de teclado ignora também `isContentEditable` e `closest("[data-lb-nokeys]")`
- [ ] **Nenhuma alteração** em `Face`, `surfaceOf`, `faces`, `toc`, `inWindow`, `surfaceCache` ou `angles`
- [ ] **Toda a suíte de caracterização da Fase 0 continua verde**
- [ ] Gate: `npm run typecheck && npm run build && npm run test`
- [ ] Test count: ≥ 3 testes novos, mais os da Fase 0 sem regressão

**Tests**: unit · **Gate**: build
**Commit**: `feat(live-book): adicionar props de chassi e guarda de contentEditable`

---

### T12: Criar a surface `manuscript`

**What**: tema, layouts e registro da surface de texto corrido.
**Where**: `src/book/surfaces/manuscript/index.tsx`, `__tests__/manuscript.test.ts`
**Depends on**: T4, T11
**Reuses**: paleta de `live-book.css:7-62` — o tema atual, sem mudança
**Requirement**: DOC-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `manuscript` registrada com `theme`, `layouts` e `defaultWindowRadius`
- [ ] `theme` traduzido em custom properties `--lb-*` aplicadas via `style`
- [ ] `defaultWindowRadius` chega ao motor como `windowRadius`
- [ ] Nenhum bloco exclusivo — `manuscript` usa só o núcleo
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 3 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar surface manuscript`

---

### T13: Converter o demo em documento

**What**: o conteúdo inteiro de `App.tsx` expresso como `BookDoc`.
**Where**: `src/demo/demoDoc.ts`
**Depends on**: T2, T5, T6, T7, T12
**Requirement**: DOC-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] As 10 páginas do demo expressas como `BookPage[]`, com `chapter`, `title` e `tone` preservados
- [ ] Capa e contracapa expressas como `CoverSpec`
- [ ] **Se algum conteúdo não for expressável, o schema é corrigido — não o conteúdo** (DOC-09 AC 4)
- [ ] O documento passa em `migrateDoc` sem alteração
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 2 testes passando (documento válido, sumário com os 3 capítulos esperados)

**Tests**: unit · **Gate**: quick
**Commit**: `feat(demo): expressar o demo como documento`

---

### T14: Ligar o app ao renderer

**What**: `App.tsx` renderizando a partir do documento, e o teste de integração de DOC-09.
**Where**: `src/App.tsx`, `src/book/__tests__/integration.test.tsx`
**Depends on**: T10, T13
**Requirement**: DOC-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `App.tsx` usa `renderPages(demoDoc, ctx)` como children do `LiveBook`
- [ ] Tema e `windowRadius` vêm da surface
- [ ] Teste de integração: o sumário tem os mesmos 3 capítulos de antes, nas mesmas folhas
- [ ] Teste de integração: a numeração impressa coincide página a página com a esperada
- [ ] Verificação visual manual: abrir no preview e comparar com a versão anterior
- [ ] Nenhum `import` de `src/book/` dentro de `src/live-book/` (verificável por busca)
- [ ] Gate: `npm run typecheck && npm run build && npm run test`
- [ ] Test count: ≥ 4 testes passando

**Tests**: unit · **Gate**: build
**Commit**: `feat(app): renderizar o livro a partir do documento`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ─┬──→ T2
              └──→ T3
Phase 2:  T4 ─┬──→ T5              (T4 depende de T1)
              ├──→ T6
              └──→ T7
Phase 3:  T8 ──→ T9 ──→ T10        (T8 depende de T1; T9 também de T4)
Phase 4:  T11 ──→ T12 ──→ T13 ──→ T14
                          ↑ T2,T5,T6,T7      ↑ T10
```

Total: 14 tasks → 2 batches de 7 (Phase 1+2 = 7, Phase 3+4 = 7). O Execute deve oferecer
sub-agentes de batch.

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1: schema | 1 módulo de tipos | ✅ |
| T2: factory | 3 funções coesas, 1 arquivo | ✅ |
| T3: migrate | 1 função + cadeia | ✅ |
| T4: registry | 1 módulo coeso | ✅ |
| T5: blocos de texto | 3 componentes irmãos | ✅ |
| T6: blocos de estrutura | 3 componentes irmãos | ✅ |
| T7: blocos de mídia | 2 componentes irmãos | ✅ |
| T8: ctx + boundary | 2 peças coesas | ✅ |
| T9: PageBody | 1 componente | ✅ |
| T10: renderPages | 1 módulo (2 funções) | ✅ |
| T11: motor | 3 mudanças pontuais, 2 arquivos | ✅ |
| T12: surface manuscript | 1 surface | ✅ |
| T13: demoDoc | 1 módulo de dados | ✅ |
| T14: App + integração | 1 arquivo + 1 suíte | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama mostra | Status |
|---|---|---|---|
| T1 | None | sem entrada | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T1 | T1 → T3 | ✅ |
| T4 | T1 | T1 → T4 (entre fases) | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T4 | T4 → T6 | ✅ |
| T7 | T4 | T4 → T7 | ✅ |
| T8 | T1 | T1 → T8 (entre fases) | ✅ |
| T9 | T4, T8 | T8 → T9, T4 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | None | sem entrada | ✅ |
| T12 | T4, T11 | T11 → T12, T4 → T12 | ✅ |
| T13 | T2, T5, T6, T7, T12 | T12 → T13 + entradas anotadas | ✅ |
| T14 | T10, T13 | T13 → T14, T10 → T14 | ✅ |

Nenhuma task depende de fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task declara | Status |
|---|---|---|---|---|
| T1 | Tipos e schema | none | none | ✅ |
| T2 | Função pura de domínio | unit | unit | ✅ |
| T3 | Função pura de domínio | unit | unit | ✅ |
| T4 | Registry | unit | unit | ✅ |
| T5 | Componente de bloco | unit | unit | ✅ |
| T6 | Componente de bloco | unit | unit | ✅ |
| T7 | Componente de bloco | unit | unit | ✅ |
| T8 | Componente (boundary) | unit | unit | ✅ |
| T9 | Componente | unit | unit | ✅ |
| T10 | Função pura de domínio | unit | unit | ✅ |
| T11 | Motor | unit | unit | ✅ |
| T12 | Registry + tipos | unit | unit | ✅ |
| T13 | Função pura (dados) | unit | unit | ✅ |
| T14 | Integração documento → motor | unit | unit | ✅ |

Nenhuma violação. `Tests: none` aparece só em T1, que é camada de tipos.

---

## Decisões de nível de projeto a registrar

Ao aprovar este plano, acrescentar em `.specs/STATE.md`:

- **AD-023** — `album` movida para a Fase 3; Fase 1 entrega só `manuscript`
- **AD-024** — bloco `text` renderiza HTML sem sanitização enquanto o documento vier de
  módulo local; sanitização vira obrigação da Fase 2, quando o documento passa a vir da rede
