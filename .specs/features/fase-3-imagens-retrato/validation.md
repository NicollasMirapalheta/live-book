# Fase 3 — Imagens, surface `album` e modo retrato — Validation

**Date**: 2026-08-05
**Spec**: `.specs/features/fase-3-imagens-retrato/spec.md`
**Diff range**: `207e039..HEAD` (24 commits)
**Verifier**: independent sub-agent (author ≠ verifier), read-only sobre a árvore real;
mutações do sensor rodadas em estado descartável e revertidas por `git checkout`.

**Verdict**: ✅ **PASS**

- Spec-anchored: 11/11 requisitos (MEDIA-01..11) cobertos com evidência `file:line`.
- Gate: `tsc --noEmit` limpo; `vitest run` → **316 passed, 2 skipped** (53 arquivos).
- Sensor: **7 mutações injetadas, 7 killed, 0 survived**.
- 3 spec-precision gaps sinalizados (não são falhas — ver abaixo).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 validate (magic bytes) | ✅ Done | `src/media/validate.ts` |
| T2 exif | ✅ Done | `src/media/exif.ts` |
| T3 process + lqip | ✅ Done | `src/media/process.ts`, `lqip.ts` |
| T4 pipeline + worker | ✅ Done | `src/media/pipeline.ts`, `worker.ts` |
| T5 contrato `uploadAsset` | ✅ Done | `StorageAdapter.ts`, `adapter.contract.ts` |
| T6 LocalAdapter | ✅ Done | upload/gc real/assetUrl por size |
| T7 SupabaseAdapter + SQL | ✅ Done | inclui `SPEC_DEVIATION` documentado |
| T8 PublicAdapter | ✅ Done | `uploadAsset`/`gcAssets` lançam `WriteForbiddenError` |
| T9 uploadBatch | ✅ Done | pipeline resumível |
| T10 ImportRoute | ✅ Done | happy + falha parcial + conflito rev |
| T11 album esqueleto | ✅ Done | tema, margem tight, `defaultWindowRadius=2` |
| T12 layouts full-bleed/single/text | ✅ Done | |
| T13 layouts duo/grid/photo-text | ✅ Done | |
| T14 molduras plain/polaroid/bleed/circle | ✅ Done | |
| T15 useStageScale (retrato) | ✅ Done | aditivo, desktop byte-idêntico |
| T16 usePortraitFrame | ✅ Done | gatilho/enquadramento/swipe |
| T17 wiring LiveBook | ✅ Done | só `stageX` aditivo (AD-005/AD-029) |
| T18 shot.mjs | ✅ Done | resolve browser via Playwright |
| T19 e2e perf | ✅ Done | `e2e/perf.spec.ts` (não executado — sem browser) |

---

## Spec-Anchored Acceptance Criteria

### MEDIA-01 — Pipeline: variantes, EXIF, ≤200KB, lqip≤1KB

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Variantes page(1100)/thumb(320) | page=1100px, thumb=320px maior lado | `process.test.ts:63-66` — `expect(Math.max(pageCall.w,pageCall.h)).toBe(PAGE_MAX_SIDE)`, `toMatchObject({w:320,h:240})` | ✅ |
| Orientação EXIF correta | w/h trocados em 5..8, orientação repassada | `process.test.ts:81-84` — `expect(result.w).toBe(3000)`, `calls[0].toMatchObject({w:825,h:1100,orientation:6})`; `exif.test.ts:51-55` (8 orientações) | ✅ |
| page ≤200KB por redução de qualidade | reduz em passos até ≤`MAX_PAGE_BYTES` | `process.test.ts:94-99` — `expect(result.page.size).toBeLessThanOrEqual(MAX_PAGE_BYTES)` + qualidade decrescente | ✅ |
| lqip data URI ≤1KB, 20px | ≤1024 bytes, 20px maior lado | `lqip.test.ts:29,43` — `toBe(LQIP_MAX_SIDE)`, `toBeLessThanOrEqual(LQIP_MAX_BYTES)` | ✅ |

### MEDIA-02 — Worker, fallback, ≤50ms

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Roda em worker | com suporte usa worker, não main | `pipeline.test.ts:78-80` — `expect(runWorker).toHaveBeenCalledTimes(1)`, `runMain not called` | ✅ |
| Fallback sem OffscreenCanvas | cai no main-thread serial | `pipeline.test.ts:87-89` — `expect(runMain).toHaveBeenCalledTimes(1)` | ✅ |
| Worker e fallback = mesmo resultado | ProcessedImage idêntico | `pipeline.test.ts:111-113` — `expect(viaWorker).toEqual(viaMain)` | ✅ |
| main-thread não bloqueia >50ms/arquivo | ≤50ms/arquivo | — (assegurado por design: offload ao worker; lqip 20px na main) | ⚠️ spec-precision gap |

### MEDIA-03 — Limites e recusa de formato

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Magic bytes, não extensão | 5 formatos + heic + unknown por bytes | `validate.test.ts:41-64` — `toBe("jpeg"/"png"/"webp"/"avif"/"heic"/"unknown")` | ✅ |
| HEIC recusado | `{ok:false,reason:"heic"}` | `validate.test.ts:68` — `toEqual({ok:false,reason:"heic"})` | ✅ |
| Não-imagem | `"not-an-image"` sem quebrar | `validate.test.ts:73-75` | ✅ |
| >2MB | `"too-large"` | `validate.test.ts:78-82`; `MAX_ASSET_BYTES===2MB` linha 116 | ✅ |
| >8000px | `"too-many-pixels"`, nunca trava | `validate.test.ts:100-108` (checkDimensions); aplicado em `pipeline.test.ts:59-70` | ✅ |

### MEDIA-04 — Memória: ≤10 faces com windowRadius=2

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| album usa windowRadius=2 | `defaultWindowRadius===2` | `album.test.ts:19` — `expect(album.defaultWindowRadius).toBe(2)` | ✅ |
| ≤10 faces montadas (runtime) | falha acima de 10 | `perf.spec.ts:148` — `expect(mountedImageFaces).toBeLessThanOrEqual(10)` | ✅ (asserção real; e2e não executado) |

### MEDIA-05 — LQIP, reserva de caixa, prefetch, eager

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Emite width/height | reserva caixa por w/h | `media-blocks.test.tsx:17-18` — `getAttribute("width")==="800"`, height="600" | ✅ |
| lqip pinta antes de requisição | background no wrapper | `media-blocks.test.tsx:39-40` — `frame.style.backgroundImage` contém o data URI | ✅ |
| `loading` nunca `lazy` | `loading="eager"` | `media-blocks.test.tsx:27-28` — `toBe("eager")`, `not.toBe("lazy")` | ✅ |
| prefetch das folhas vizinhas em ocioso | pré-carrega vizinhas | `eager` + janela do motor já é o lazy-loader (design AD-014); sem asserção dedicada de prefetch | ⚠️ spec-precision gap |

> Nota: MEDIA-05 é satisfeito pelo bloco `Image` de núcleo (pré-existente, exercitado
> pelos layouts do album — conforme tasks.md). `AlbumPhoto.tsx:48-58` espelha o mesmo
> contrato (eager/decoding/w-h/object-fit).

### MEDIA-06 — Surface album: tema, 6 layouts, full-bleed sem número, registro aditivo

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Tema próprio + margem estreita | tema distinto, `margin:"tight"` | `album.test.ts:26-30` — `vars["--lb-accent"]==="#b5745a"`, `not.toBe(manuscript)`; `chrome.margin==="tight"` | ✅ |
| 6 layouts existem | full-bleed/single/duo/grid/photo-text/text | `album-layouts.test.ts:38`, `album-layouts-b.test.ts:34` — `arrayContaining([...])`; seeds coerentes | ✅ |
| full-bleed sangra e suprime número | classe `--full` + `hideNumber` | `album-layouts.test.ts:55,63-65` — `photo--full`, `pages[0].props.hideNumber===true`, `[1] falsy` | ✅ |
| registrar não altera existente | album ∪ core; manuscript intacto | `album.test.ts:35-46` — `ids contain album+manuscript`, 8 blocos de núcleo presentes | ✅ |

### MEDIA-07 — Molduras: 4 distintas, aspecto extremo contido

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| plain/polaroid/bleed/circle distintas | 4 classes distintas | `album-frames.test.ts:27-37` — `Set(classes).size===4`, classe `--${frame}` | ✅ |
| aspecto extremo contido sem distorcer | object-fit + caixa reservada | `album-frames.test.ts:52-55` — `objectFit==="cover"`, width="4000" height="200" | ✅ |

### MEDIA-08 — Retrato legível ≥320px em 390

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| ≥320px em 390×844 | página ≥320px | `stageScale.test.tsx:34,46` — `expect(result.current*PAGE_W).toBeGreaterThanOrEqual(320)` | ✅ |

### MEDIA-09 — Virada preservada, swipe, vira no limite

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| Virada 3D em retrato = desktop | folhas montam, goTo vira | `portraitWiring.test.tsx:69-77` — `.lb-face--front/back` montadas, `goTo(2)` → `getLeaf()===2` | ✅ |
| Swipe alterna lado do spread | left↔right sem virar | `portraitFrame.test.tsx:80-86` — `frameSide` alterna, `goTo not called` | ✅ |
| Swipe além do limite vira folha | `goTo(±1)` + reposiciona | `portraitFrame.test.tsx:100-102,115-116` — `goTo(4)`/`goTo(2)` + frameSide reposicionado | ✅ |
| Swipe end-to-end no viewport | TouchEvent vira via goTo real | `portraitWiring.test.tsx:97-102` — 2º swipe → `onLeafChange(1)` | ✅ |

### MEDIA-10 — Sem regressão em desktop, caracterização Fase 0 verde

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| off→on→off sem recarregar | portrait reativo | `portraitFrame.test.tsx:61-65` — `portrait` false→true→false | ✅ |
| desktop byte-idêntico quando off | escala == fórmula anterior | `stageScale.test.tsx:64-65` — `expect(absent).toBe(expected)`, `off===expected` | ✅ |
| virtualização idêntica on/off | mesmas folhas/faces | `portraitWiring.test.tsx:121-123` — `portraitLeaves===desktopLeaves`, faces iguais | ✅ |
| caracterização Fase 0 verde | faces/window/toc/additive verdes | Gate: `faces.test`, `window.test`, `toc.test`, `additive.test` todos passam | ✅ |

### MEDIA-11 — Verificação automatizada de performance

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| -------- | --------------- | ---------------------- | --------- |
| FPS<30 falha | `>=30 FPS` sob throttle 4× | `perf.spec.ts:185` — `expect(fps).toBeGreaterThanOrEqual(30)` | ✅ (asserção real; e2e não executado) |
| faces>10 falha | `<=10` faces | `perf.spec.ts:148` — `toBeLessThanOrEqual(10)` | ✅ (asserção real) |
| shot.mjs resolve via Playwright | sem executablePath fixo | `shot.mjs:28` — `chromium.launch()` sem path fixo (verificado no fonte) | ✅ |

**Status**: ✅ 11/11 requisitos cobertos por evidência; 3 spec-precision gaps sinalizados.

---

## Discrimination Sensor

Todas as mutações injetadas na árvore real, teste-alvo executado, **revertidas por
`git checkout`** (árvore final limpa: só o `design.md` untracked pré-existente).

| # | File:line | Mutação | Teste-alvo | Killed? |
| - | --------- | ------- | ---------- | ------- |
| 1 | `process.ts:52` | `orientedSize`: `{w:h,h:w}` → `{w,h}` (não troca eixos em 5..8) | `process.test.ts` | ✅ Killed (2 fail) |
| 2 | `process.ts:81` | `page.size <= MAX_PAGE_BYTES` → `>=` | `process.test.ts` | ✅ Killed |
| 3 | `pipeline.ts:75-79` | lqip movido para DEPOIS do worker (regressão detach do browser real) | `pipeline.test.ts:117` | ✅ Killed |
| 4 | `album/index.tsx:38` | `defaultWindowRadius: 2` → `4` | `album.test.ts:19` | ✅ Killed |
| 5 | `usePortraitFrame.ts:81` | `setPortrait(mq.matches)` → `setPortrait(!mq.matches)` (gatilho invertido) | `portraitFrame.test.tsx` | ✅ Killed |
| 6 | `PublicAdapter.ts:69` | `uploadAsset` throw → `return {id:"noop"}` (upload proibido vira no-op) | `public.contract.test.ts` | ✅ Killed |
| 7 | `LocalAdapter.ts:231-234` | `gcAssets` deixa de somar ids das revisões retidas (não preserva revisão) | `local.contract.test.ts` | ✅ Killed |

**Sensor depth**: P0-full (7 mutações — feature de risco alto: geometria do motor + VRAM).
**Result**: **7/7 killed** — ✅

Atenção validada explicitamente:
- **lqip antes de transferir o bitmap** (bug real de navegador, corrigido em `9db36bc`):
  teste de regressão existe (`pipeline.test.ts:117-138`) e MATA a mutação 3.
- **preservação de revisão no gc** (AD-025): teste de contrato de upload
  (`adapter.contract.ts:277-297`) e MATA a mutação 7.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Mudanças em `LiveBook.tsx` estritamente aditivas (só `stageX`/wiring, AD-005/AD-029) | ✅ (diff confirma: `goToRef`, `frameX`, `stageXFramed`; `x: stageX` → `x: stageXFramed`) |
| `useStageScale.ts` aditivo, desktop byte-idêntico | ✅ (default `portrait=false`; teste 64-65) |
| Arquivos protegidos AD-022 intocados | ✅ (`Leaf.tsx`/`constants.ts`/geometria/`faces`/`angles`/`surfaceOf`/`surfaceCache` fora do diff) |
| `usePortraitFrame.ts` é arquivo novo, fora da lista vigiada | ✅ |
| `src/live-book/` não importa de `book/`/`data/`/`routes/`/`editor/` | ✅ (só `constants`/`useStageScale`) |
| Registro do album não altera renderer/registry (MEDIA-06 AC5) | ✅ |
| `assetUrl` síncrona (invariante 5) nos 3 adapters | ✅ |
| Cada teste no escopo mapeia a AC/edge/done-when | ✅ (headers dos testes citam MEDIA-NN) |

---

## Edge Cases

- [x] Imagem >8000px recusada sem travar — `pipeline.test.ts:59-70`
- [x] Não-imagem apesar da extensão pulada sem quebrar o lote — `uploadBatch.test.ts:63-88`
- [x] Upload falha no meio do lote: enviados permanecem, lote retomável — `uploadBatch.test.ts:92-149`, `ImportRoute.test.tsx:100-157`
- [x] Imagem removida do doc coletada no save seguinte — `adapter.contract.ts:277-297`
- [x] Proporção extrema contida sem distorcer — `album-frames.test.ts:47-56`
- [x] Tablet em pé não dispara retrato (gatilho `max-aspect-ratio: 3/4`) — coberto pelo gatilho `matchMedia` (`portraitFrame.test.tsx:53-66`); confirmação em device é gate de aceite (AD-029)

---

## Gate Check

- **Comando**: `npm run typecheck && vitest run` (Build gate, `tasks.md`)
- **typecheck**: `tsc --noEmit -p tsconfig.app.json` — limpo, 0 erros
- **vitest**: **316 passed, 2 skipped** (53 arquivos)
- **Skips justificados**:
  1. `src/data/supabase/__tests__/supabase.contract.test.ts` — contrato ao vivo, roda só com credenciais (lógica de upload coberta offline em `supabase.upload.test.ts`)
  2. (2º skip pré-existente da suíte, fora do escopo Fase 3)
- **e2e**: `e2e/perf.spec.ts` + `playwright.config.ts` existem; asserções reais confirmadas
  no fonte (`>=30` FPS linha 185, `<=10` faces linha 148) — **não enfraquecidas**. Não
  executado (ambiente pode não ter browser), conforme instrução.
- **Falhas**: nenhuma.

---

## SPEC_DEVIATION (herdado, verificado)

Autorização de upload no `SupabaseAdapter`/`schema.sql` usa o modelo **uuid-como-segredo
(AD-013)** em vez de `edit_token` (AD-028 pedia por token). Sem infra de login, a RLS de
storage não confere token.

- **Documentado?** ✅ Sim — `schema.sql` traz comentário explícito `SPEC_DEVIATION:` com
  justificativa e plano ("quando Auth entrar, apertar para owner_id").
- **Coerente?** ✅ Sim — consistente com AD-013 (bucket público, segredo é o uuid do path);
  path escopado por volume `{bookId}/{uuid}/{size}.webp`; teto 2MB espelha `MAX_ASSET_BYTES`.
- Não é gap: é desvio consciente registrado.

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| MEDIA-01 | Pending | ✅ Verified |
| MEDIA-02 | Pending | ✅ Verified (com spec-precision gap no orçamento de 50ms) |
| MEDIA-03 | Pending | ✅ Verified |
| MEDIA-04 | Pending | ✅ Verified (config unit + asserção e2e real) |
| MEDIA-05 | Pending | ✅ Verified (com spec-precision gap no prefetch dedicado) |
| MEDIA-06 | Done | ✅ Verified |
| MEDIA-07 | Done | ✅ Verified |
| MEDIA-08 | Pending | ✅ Verified |
| MEDIA-09 | Pending | ✅ Verified |
| MEDIA-10 | Pending | ✅ Verified |
| MEDIA-11 | Pending | ✅ Verified (asserções e2e reais; suíte não executada aqui) |

---

## Spec-Precision Gaps (não bloqueiam — registrar como lição)

1. **MEDIA-02 AC3 — orçamento de ≤50ms/arquivo na main thread** não tem asserção que o
   meça: é assegurado estruturalmente (offload ao worker). O e2e mede FPS ao folhear, não
   o bloqueio por arquivo na ingestão. A spec define um número preciso (50ms) sem teste
   que o afira.
2. **MEDIA-05 AC (prefetch das folhas vizinhas em tempo ocioso)** — coberto pela semântica
   `eager` + janela de virtualização, mas sem asserção dedicada de "vizinhas pré-carregadas
   em idle".
3. **Success Criteria "álbum de 60 fotos < 15 MB"** — consequência aritmética do teto de
   200KB/página, mas não há teste independente que o verifique.

---

## Summary

**Overall**: ✅ **Ready**

**Spec-anchored**: 11/11 ACs com evidência `file:line` batendo com o outcome da spec;
3 spec-precision gaps sinalizados (design-defensáveis, não falhas).
**Sensor**: 7/7 mutações killed (inclui as duas regressões de atenção: lqip-antes-do-detach
e preservação de revisão no gc).
**Gate**: 316 passed, 2 skipped, typecheck limpo.

**O que funciona**: pipeline de mídia (validate/exif/process/lqip/worker+fallback), contrato
de upload nos 3 adapters com gc preservando revisão, lote resumível + rota de importação,
surface album completa (tema/6 layouts/4 molduras/full-bleed), modo retrato aditivo com
virada preservada e caracterização da Fase 0 verde, e verificação e2e com asserções reais.

**Issues**: nenhum bloqueador. Os 3 spec-precision gaps ficam como lições; o e2e de
performance precisa rodar num ambiente com browser antes do fechamento definitivo da fase
(gate de aceite em device, já previsto em AD-029).

**Next steps**: distilar as 3 spec-precision gaps como lições (`scripts/lessons.py`);
executar `e2e/perf.spec.ts` num ambiente com Chromium; validação em celular físico do
gatilho `3/4` e do gesto de swipe (gate de aceite AD-029).
