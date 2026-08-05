# Fase 3 — Imagens, surface `album` e modo retrato — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill
is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy
review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/fase-3-imagens-retrato/design.md`
**Status**: **Done** — T1–T19 executadas (3 batches) + fix `9db36bc`. Verifier: **PASS** (11/11 ACs, sensor 7/7, gate 316 verdes). Relatório em `validation.md`.

> Batch 1 SPEC_DEVIATION: upload autorizado por uuid-segredo (AD-013) em vez de edit_token (sem infra de login), marcado em `schema.sql` — apertar quando Auth entrar.
> Bug pego no e2e real e corrigido (`9db36bc`): lqip precisava ser computado antes de transferir o bitmap ao worker (detach). Lição registrada.
> Gates diferidos (AD-029): validar gatilho `3/4` + gesto de swipe em celular real; rodar `npx playwright test` em ambiente com Chromium.
> Deferido: hidratar cache de object URLs do LocalAdapter em `getBook` (só importa ao renderizar blobs locais após reload).

---

## Test Coverage Matrix

> Gerada de codebase + guidelines + spec. Guidelines encontradas: `CLAUDE.md`,
> `docs/testing/strategy.md` (referenciado no CLAUDE.md), `vitest.config.ts`, `AD-016`
> (teste deriva do critério de aceite, nunca espelha implementação). Testes co-locados em
> `__tests__/`, framework **vitest** + testing-library + jsdom; `fake-indexeddb` e
> `playwright` já instalados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Mídia (pura: validate/exif/process/lqip/pipeline) | unit | Todos os ramos; 1:1 com ACs de MEDIA-01/02/03; todo edge case listado | `src/media/__tests__/*.test.ts` | `npm test` |
| Ingest (uploadBatch) | unit | Ramos de sucesso/falha parcial/retomada; edge cases de lote | `src/ingest/__tests__/*.test.ts` | `npm test` |
| Adapter (uploadAsset/gcAssets/assetUrl) | integration | Bloco de contrato roda nos 3 adapters: round-trip, size, gc preserva revisão, WriteForbidden | `src/data/**/__tests__/*.contract.test.ts`, `src/data/__tests__/adapter.contract.ts` | `npm test` |
| Rota (ImportRoute) | integration | Happy + falha de upload + retomada | `src/routes/__tests__/*.test.tsx` | `npm test` |
| Surface `album` (SurfaceDef + layouts + molduras) | unit | 1:1 com ACs de MEDIA-06/07; registrar não altera existente; molduras distintas; aspecto extremo contido | `src/book/surfaces/album/__tests__/*.test.tsx` | `npm test` |
| Motor retrato (useStageScale/usePortraitFrame + wiring) | unit | ACs de MEDIA-08/09/10; desktop idêntico quando off; caracterização Fase 0 verde | `src/live-book/__tests__/*.test.tsx` | `npm test` |
| Verificação de performance | e2e | FPS ≥30 sob throttle 4×; faces montadas ≤10 | `e2e/*.spec.ts` | `npx playwright test` |
| Tooling (`shot.mjs`) | none | — (gate de build/execução) | — | build gate |

## Gate Check Commands

> Confirmar antes de Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com testes unitários | `npm test` |
| Full | Após tarefas de adapter/rota (integração roda no mesmo vitest via jsdom+fake-indexeddb) | `npm test` |
| e2e | Só na Fase 6 (performance) | `npx playwright test e2e/perf.spec.ts` |
| Build | Fim de fase / tarefas de tooling | `npm run typecheck && npm run build && npm test` |

---

## Execution Plan

Fases ordenadas, sequenciais. Tarefas dentro da fase rodam em ordem.

### Phase 1: Pipeline de mídia (puro) — MEDIA-01/02/03

```
T1 → T2 → T3 → T4
```

### Phase 2: Upload no contrato do adapter — MEDIA-03, AD-028

```
T5 → T6 → T7 → T8
```

### Phase 3: Lote resumível + rota de importação — dimensões implícitas

```
T9 → T10
```

### Phase 4: Surface `album` — MEDIA-06/07

```
T11 → T12 → T13 → T14
```

### Phase 5: Modo retrato — MEDIA-08/09/10, AD-029 (área de risco)

```
T15 → T16 → T17
```

### Phase 6: Verificação de performance — MEDIA-11

```
T18 → T19
```

---

## Task Breakdown

### T1: Validação de arquivo por magic bytes

**What**: `sniffType` (magic bytes) e `validateFile` que aceita jpeg/png/webp/avif, recusa HEIC e barra >2 MB / >8000 px.
**Where**: `src/media/validate.ts`; `MAX_ASSET_BYTES = 2*1024*1024` em `src/config/limits.ts`
**Depends on**: None
**Reuses**: `src/config/limits.ts` (padrão de constante espelhada no SQL)
**Requirement**: MEDIA-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `sniffType` identifica os 5 formatos + heic + unknown por bytes, não por extensão
- [ ] HEIC → `{ ok:false, reason:"heic" }`; não-imagem → `"not-an-image"`; >2 MB → `"too-large"`; >8000 px → `"too-many-pixels"`
- [ ] `MAX_ASSET_BYTES` exportado e comentado como espelhado no `schema.sql`
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T2: Orientação EXIF

**What**: `readExifOrientation(buf): number` (1..8) para corrigir rotação.
**Where**: `src/media/exif.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: MEDIA-01 (AC2)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lê o marcador de orientação de JPEG (APP1/TIFF); ausência → 1
- [ ] Cobre as 8 orientações + arquivo sem EXIF + buffer truncado (não lança)
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T3: Processamento — variantes e LQIP

**What**: `processImage(bitmap, orientation)` produz `page` (1100px, webp ≤200 KB) e `thumb` (320px) na orientação correta; `makeLqip(bitmap)` produz data URI ≤1 KB (20px).
**Where**: `src/media/process.ts`, `src/media/lqip.ts`
**Depends on**: T2
**Reuses**: `exif.ts` (T2); recebe `ImageBitmap` para ser testável sem DOM
**Requirement**: MEDIA-01 (AC1/AC2/AC6/AC7)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `page` = 1100px no maior lado, webp, ≤200 KB (reduz qualidade em passos até caber)
- [ ] `thumb` = 320px; ambos aplicam a orientação EXIF; `w`/`h` já corrigidos emitidos
- [ ] `makeLqip` ≤1 KB de data URI, 20px
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T4: Pipeline worker + fallback main-thread

**What**: `processInPipeline(file)` roda `process` em worker `OffscreenCanvas`; feature-detect com fallback serial na main thread; devolve `ProcessedImage`.
**Where**: `src/media/pipeline.ts`, `src/media/worker.ts`
**Depends on**: T1, T3
**Reuses**: `validate.ts` (T1), `process.ts`/`lqip.ts` (T3) idênticos nos dois caminhos
**Requirement**: MEDIA-02 (AC3/AC4), MEDIA-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Caminho worker e caminho fallback produzem o MESMO `ProcessedImage` (mesma `process`)
- [ ] Sem `OffscreenCanvas` → fallback serial, um arquivo por vez (testável)
- [ ] Bloqueio da main thread ≤50 ms/arquivo assegurado por design (worker); assert no caminho testável
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T5: Estender contrato `StorageAdapter` com `uploadAsset`

**What**: Adicionar `uploadAsset(bookId, ProcessedImage): Promise<AssetRef>` à interface; `assetUrl(ref, size)` documentado para honrar `size`; bloco de upload/round-trip/gc/WriteForbidden em `adapter.contract.ts`.
**Where**: `src/data/StorageAdapter.ts` (modify), `src/data/__tests__/adapter.contract.ts` (modify)
**Depends on**: T4
**Reuses**: `AssetRef` (`schema.ts`), padrão de contrato existente, `ProcessedImage` (T4)
**Requirement**: MEDIA-03, AD-028

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Interface tem `uploadAsset`; tipos exportados; sem erro TS
- [ ] `adapter.contract.ts` ganha casos: upload→assetUrl round-trip por size, gc preserva referenciado por revisão, upload em somente-leitura lança
- [ ] Contrato ainda compila para os 3 adapters (falhará até T6–T8 implementarem — esperado dentro da fase)
- [ ] Gate `npm test` passa nos adapters já implementados · Test count: registrar N

**Tests**: integration · **Gate**: full

---

### T6: `LocalAdapter` — upload, gc e assetUrl por size

**What**: `uploadAsset` grava blobs no IndexedDB por `{id}/{size}`; `assetUrl` devolve object URL cacheado (síncrono); `gcAssets` apaga blobs fora do doc, preservando os referenciados por qualquer revisão retida.
**Where**: `src/data/local/LocalAdapter.ts` (modify)
**Depends on**: T5
**Reuses**: store IndexedDB existente (`idb`), `gcAssets` no-op atual, `assetUrl` atual
**Requirement**: MEDIA-03, AD-028, AD-025 (preservação de revisão)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `uploadAsset` gera uuid, persiste `page`+`thumb`, embute `lqip` no ref
- [ ] `assetUrl(ref, "page"|"thumb")` síncrona, object URL cacheado (invariante 5)
- [ ] `gcAssets` remove órfãos mas preserva o referenciado por qualquer uma das 20 revisões
- [ ] Bloco de contrato de upload passa para `local` · Gate `npm test` · Test count: registrar N

**Tests**: integration · **Gate**: full

---

### T7: `SupabaseAdapter` — upload, gc, assetUrl e policy SQL

**What**: `uploadAsset` sobe ao bucket `book-assets/{bookId}/{id}/{size}.webp` autorizado por `edit_token`; `assetUrl` honra size; `gcAssets` lista e remove órfãos preservando revisões; `schema.sql` ganha policy/RPC de upload + teto 2 MB por objeto, espelhando `MAX_ASSET_BYTES`.
**Where**: `src/data/supabase/SupabaseAdapter.ts` (modify), `src/data/supabase/schema.sql` (modify)
**Depends on**: T5
**Reuses**: `client.ts`, `assetUrl` base URL atual, RPCs `security definer` (`AD-012`)
**Requirement**: MEDIA-03, AD-028, AD-013

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `uploadAsset` sobe as 2 variantes no path convencionado; autorização por `edit_token`
- [ ] `assetUrl(ref, size)` monta `.../{id}/{size}.webp` síncrona
- [ ] `schema.sql`: policy de escrita no bucket por token + teto 2 MB (espelha `limits.ts`)
- [ ] Bloco de contrato (mockado) + auth test passam para `supabase` · Gate `npm test` · Test count: registrar N

**Tests**: integration · **Gate**: full

---

### T8: `PublicAdapter` — upload proibido

**What**: `uploadAsset` lança `WriteForbiddenError`; `gcAssets` idem (somente leitura).
**Where**: `src/data/public/PublicAdapter.ts` (modify)
**Depends on**: T5
**Reuses**: padrão de `WriteForbiddenError` já usado nos outros métodos de escrita
**Requirement**: AD-028 (fronteira de autorização)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `uploadAsset` lança `WriteForbiddenError`
- [ ] Bloco de contrato de somente-leitura passa para `public` · Gate `npm test` · Test count: registrar N

**Tests**: integration · **Gate**: full

---

### T9: Lote de upload resumível em pipeline

**What**: `uploadBatch(files, bookId, adapter, onProgress)` processa N+1 enquanto sobe N, serial por arquivo, retomável; não escreve página antes do upload confirmar; devolve enviados + falhados.
**Where**: `src/ingest/uploadBatch.ts`
**Depends on**: T4, T6
**Reuses**: `processInPipeline` (T4), `StorageAdapter.uploadAsset` (T5/T6)
**Requirement**: dimensões implícitas (falha parcial, concorrência, integridade de transição)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Falha no meio do lote preserva os já enviados e devolve os falhados; retomar reenvia só os que faltam
- [ ] Nenhuma página parcial é produzida por ingestão cancelada
- [ ] Arquivo recusado (HEIC/não-imagem) é pulado sem quebrar o lote
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T10: Rota de importação simples

**What**: `ImportRoute` — dropar arquivos num volume existente → `uploadBatch` → anexar uma página de imagem por foto → salvar via adapter, com estado de progresso/retomada.
**Where**: `src/routes/ImportRoute.tsx`; registrar em `src/routes/AppRouter.tsx`
**Depends on**: T9
**Reuses**: `uploadBatch` (T9), `AdapterContext`, `factory`/schema para montar páginas, padrão das rotas existentes
**Requirement**: Out of Scope da spec ("upload exercitado por rota de importação simples")

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Drop → processa+sobe → anexa páginas → `saveBook` com `rev`; conflito não vira sobrescrita
- [ ] Falha de upload mostra retomar; nenhum asset órfão fica no doc
- [ ] Teste de rota (happy + falha parcial) passa · Gate `npm test` · Test count: registrar N

**Tests**: integration · **Gate**: full

---

### T11: Surface `album` — esqueleto e registro

**What**: `SurfaceDef` do `album` com tema próprio, `chrome: { margin: "tight" }`, `defaultWindowRadius: 2`, registro via `registerSurface`; `album.css` base.
**Where**: `src/book/surfaces/album/index.tsx`, `src/book/surfaces/album/album.css`
**Depends on**: None
**Reuses**: molde de `manuscript/index.tsx`, `registerSurface`, `themeToVars`, custom props `--lb-*`
**Requirement**: MEDIA-06 (AC1/AC5)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `album` abre com tema/margens estreitas/`defaultWindowRadius=2`
- [ ] Registrar `album` não exige alterar nenhum arquivo existente (MEDIA-06 AC5)
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T12: Layouts `full-bleed`, `single`, `text`

**What**: Três layouts com `seed()`; `full-bleed` sangra até a borda e suprime numeração (`hideNumber`).
**Where**: `src/book/surfaces/album/blocks/` + registro em `index.tsx` (modify)
**Depends on**: T11
**Reuses**: bloco `Image` do núcleo (box-reservation + lqip + eager)
**Requirement**: MEDIA-06 (AC2/AC3)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `full-bleed` sangra e NÃO mostra número; `single`/`text` produzem resultados distintos
- [ ] `seed()` de cada layout devolve blocos iniciais coerentes
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T13: Layouts `duo`, `grid`, `photo-text`

**What**: Três layouts com `seed()`; `grid` reusa `Gallery`; `photo-text` combina imagem + texto.
**Where**: `src/book/surfaces/album/blocks/` + registro em `index.tsx` (modify)
**Depends on**: T12
**Reuses**: bloco `Gallery` do núcleo (base do `grid`), bloco `Image`, `Text`
**Requirement**: MEDIA-06 (AC2)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `duo`, `grid`, `photo-text` produzem resultados visualmente distintos entre si e dos de T12
- [ ] `seed()` de cada um devolve blocos iniciais coerentes
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T14: Molduras `plain`/`polaroid`/`bleed`/`circle`

**What**: Quatro molduras aplicáveis à imagem, com resultados distintos; contêm proporção extrema sem distorcer.
**Where**: `src/book/surfaces/album/blocks/` (frame wrapper) + `album.css` (modify)
**Depends on**: T12
**Reuses**: bloco `Image`, `album.css`
**Requirement**: MEDIA-07 (AC4), edge case de aspecto extremo

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `plain`, `polaroid`, `bleed`, `circle` produzem 4 resultados distintos (classe/estrutura distinta)
- [ ] Imagem de proporção extrema é contida sem distorção (`object-fit`)
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T15: `useStageScale` — modo página única

**What**: `useStageScale(ref, { portrait })` — em retrato escala pela largura de UMA página (`PAGE_W + 2·BOARD_SQUARE`), garantindo ≥320px em 390×844; desktop inalterado quando `portrait=false`.
**Where**: `src/live-book/useStageScale.ts` (modify — aditivo, arquivo WARNED por `guard-engine`)
**Depends on**: None
**Reuses**: `fit`/`estimate` existentes; `constants.ts` (só leitura)
**Requirement**: MEDIA-08 (AC1), MEDIA-10 (AC7), AD-005/AD-029

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Em 390×844 com `portrait=true`, a página ≥320px de largura
- [ ] Com `portrait=false` a escala é byte-idêntica à atual (assinatura opcional, default off)
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T16: `usePortraitFrame` — gatilho, enquadramento e swipe

**What**: Hook novo: `matchMedia("(max-aspect-ratio: 3/4)")` liga o retrato; expõe `frameSide` (left/right); calcula o termo de enquadramento para o `stageX`; swipe alterna lado e, no limite, chama `goTo` (vira a folha) e reposiciona.
**Where**: `src/live-book/usePortraitFrame.ts` (NOVO — fora da lista vigiada)
**Depends on**: T15
**Reuses**: `goTo` da API imperativa, padrão de `stageOffset`, `matchMedia`
**Requirement**: MEDIA-08 (AC1), MEDIA-09 (AC3/AC4), AD-029

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Swipe dentro do spread alterna enquadramento esquerda↔direita
- [ ] Swipe além do limite chama `goTo` e reposiciona o lado enquadrado
- [ ] `matchMedia` off→on→off atualiza `portrait` sem recarregar
- [ ] Gate `npm test` passa · Test count: registrar N

**Tests**: unit · **Gate**: quick

---

### T17: Ligar retrato ao `LiveBook` (aditivo)

**What**: Cablear `usePortraitFrame` + `useStageScale({portrait})` no `LiveBook`, somando o termo de enquadramento ao `stageX`; a virada 3D é preservada e o desktop fica idêntico quando o retrato está off.
**Where**: `src/live-book/LiveBook.tsx` (modify — só `stageX`/wiring, escopo AD-005/AD-029; arquivo WARNED)
**Depends on**: T16
**Reuses**: `stageX`/`stageOffset` existentes, `useStageScale` (T15), `usePortraitFrame` (T16)
**Requirement**: MEDIA-09 (AC2), MEDIA-10 (AC5/AC6/AC7)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Virada 3D ocorre em retrato igual ao desktop (MEDIA-09 AC2)
- [ ] Com viewport largo, comportamento desktop **idêntico** ao anterior (MEDIA-10 AC7)
- [ ] **Toda a caracterização da Fase 0 continua verde** (MEDIA-10 AC6) — sem tocar `angles`/`faces`/`surfaceOf`/`surfaceCache`/geometria CSS
- [ ] Gate `npm test` passa (incl. caracterização) · Test count: registrar N

**Tests**: unit + caracterização · **Gate**: build

---

### T18: Corrigir `shot.mjs` para resolver o browser pelo Playwright

**What**: Trocar o `executablePath` fixo por resolução via Playwright, destravando capturas neste ambiente.
**Where**: `shot.mjs` (raiz)
**Depends on**: None
**Reuses**: `playwright` (já em devDependencies)
**Requirement**: MEDIA-11 (AC3)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `shot.mjs` resolve o navegador pelo próprio Playwright (sem caminho fixo)
- [ ] `npm run shots` inicia sem erro de executável
- [ ] Gate build passa

**Tests**: none · **Gate**: build

---

### T19: e2e de performance — FPS e faces montadas

**What**: `e2e/perf.spec.ts` — folheia 20 páginas com foto sob throttle 4× de CPU, mede FPS (falha <30) e conta faces montadas com `windowRadius=2` (falha >10).
**Where**: `e2e/perf.spec.ts`; config Playwright mínima
**Depends on**: T17, T18, T10, T11
**Reuses**: `shot.mjs` corrigido (T18), rota de importação/álbum demo para semear 20 fotos
**Requirement**: MEDIA-11 (AC1/AC2), Success Criteria

**Tools**: MCP: NONE · Skill: `core-web-vitals` (opcional, referência de medição)

**Done when**:
- [ ] Suíte mede FPS ao folhear e falha abaixo de 30 sob throttle 4×
- [ ] Suíte conta faces montadas e falha acima de 10
- [ ] Gate `npx playwright test e2e/perf.spec.ts` verde

**Tests**: e2e · **Gate**: e2e

**Commit**: `feat(fase-3): verificação e2e de performance (FPS + faces montadas)`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4
Phase 2:  T5 → T6 → T7 → T8
Phase 3:  T9 → T10
Phase 4:  T11 → T12 → T13 → T14
Phase 5:  T15 → T16 → T17
Phase 6:  T18 → T19
```

Execução estritamente sequencial. 19 tarefas → ~3 batches de ~7 (offer-then-confirm no Execute).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 validate | 1 módulo puro | ✅ |
| T2 exif | 1 função | ✅ |
| T3 process+lqip | 2 funções coesas, 1 conceito | ✅ |
| T4 pipeline+worker | 1 orquestrador + seu worker | ✅ |
| T5 contrato uploadAsset | 1 interface + suíte contrato | ✅ |
| T6 LocalAdapter | 1 adapter | ✅ |
| T7 SupabaseAdapter | 1 adapter + seu SQL | ✅ |
| T8 PublicAdapter | 1 adapter | ✅ |
| T9 uploadBatch | 1 módulo | ✅ |
| T10 ImportRoute | 1 rota | ✅ |
| T11 album esqueleto | 1 SurfaceDef | ✅ |
| T12 layouts A | 3 layouts coesos | ⚠️ coeso (mesmo arquivo/conceito) |
| T13 layouts B | 3 layouts coesos | ⚠️ coeso |
| T14 molduras | 4 molduras, 1 wrapper | ⚠️ coeso |
| T15 useStageScale | 1 função (aditiva) | ✅ |
| T16 usePortraitFrame | 1 hook | ✅ |
| T17 wiring LiveBook | 1 integração | ✅ |
| T18 shot.mjs | 1 arquivo | ✅ |
| T19 e2e perf | 1 suíte | ✅ |

Os ⚠️ são grupos coesos no mesmo arquivo/conceito (layouts/molduras da mesma surface), dentro da regra "2–3 coisas relacionadas no mesmo arquivo = OK".

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | (início) | ✅ |
| T2 | None | (início) | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T1, T3 | T1→T4, T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T5 | T5→T7 | ✅ |
| T8 | T5 | T5→T8 | ✅ |
| T9 | T4, T6 | T4→T9, T6→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | None | (início fase 4) | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T12 | T12→T14 | ✅ |
| T15 | None | (início fase 5) | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T18 | None | (início fase 6) | ✅ |
| T19 | T17, T18, T10, T11 | →T19 | ✅ |

Todas as dependências apontam para trás ou dentro da mesma fase. Nota: T9 depende de T6 (fase 2) e T19 depende de T10/T11 de fases anteriores — dependências backward, válidas.

---

## Test Co-location Validation

| Task | Layer criado/modificado | Matriz exige | Task diz | Status |
| ---- | ----------------------- | ------------ | -------- | ------ |
| T1 | Mídia (pura) | unit | unit | ✅ |
| T2 | Mídia (pura) | unit | unit | ✅ |
| T3 | Mídia (pura) | unit | unit | ✅ |
| T4 | Mídia (pura) | unit | unit | ✅ |
| T5 | Adapter (contrato) | integration | integration | ✅ |
| T6 | Adapter | integration | integration | ✅ |
| T7 | Adapter | integration | integration | ✅ |
| T8 | Adapter | integration | integration | ✅ |
| T9 | Ingest | unit | unit | ✅ |
| T10 | Rota | integration | integration | ✅ |
| T11 | Surface album | unit | unit | ✅ |
| T12 | Surface album | unit | unit | ✅ |
| T13 | Surface album | unit | unit | ✅ |
| T14 | Surface album | unit | unit | ✅ |
| T15 | Motor retrato | unit | unit | ✅ |
| T16 | Motor retrato | unit | unit | ✅ |
| T17 | Motor retrato | unit | unit+caracterização | ✅ |
| T18 | Tooling | none | none | ✅ |
| T19 | Perf | e2e | e2e | ✅ |

Nenhuma violação: nenhum `Tests: none` onde a matriz exige teste (T18 é tooling, matriz = none).

---

## Requirement Traceability (atualização)

| ID | Tasks |
|---|---|
| MEDIA-01 | T2, T3, T4 |
| MEDIA-02 | T4 |
| MEDIA-03 | T1, T5, T6, T7 |
| MEDIA-04 | T11 (windowRadius=2), verificado em T19 |
| MEDIA-05 | bloco `Image` já pronto; exercitado em T12/T13 |
| MEDIA-06 | T11, T12, T13 |
| MEDIA-07 | T14 |
| MEDIA-08 | T15, T16 |
| MEDIA-09 | T16, T17 |
| MEDIA-10 | T15, T17 |
| MEDIA-11 | T18, T19 |
