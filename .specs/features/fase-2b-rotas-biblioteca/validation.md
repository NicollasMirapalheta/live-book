# Fase 2B — Rotas e biblioteca · Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/fase-2b-rotas-biblioteca/spec.md`
**Diff range**: `b2cd08c..HEAD` (2B commits `4e92884..abc7419`)
**Verifier**: independent sub-agent (author ≠ verifier), read-only, evidence-or-zero

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Router+404 | ✅ Done | `AppRouter`, `NotFoundRoute` |
| T2 chapterSlugs | ✅ Done | first-wins colisão |
| T3 readerUrl | ✅ Done | clamp + ida-volta |
| T4 ReaderShell carga | ✅ Done | `loadForRender` provado |
| T5 sync URL↔motor | ✅ Done | replace + anti-laço |
| T6 rotas/capítulo/limites | ✅ Done | — |
| T7 leitor público | ✅ Done | sem cromo de edição |
| T8 estante | ✅ Done | spy `getBook` |
| T9 novo+resgate | ✅ Done | — |
| T10 side menu | ✅ Done | — |
| T11 lb-tabs a11y | ✅ Done | — |
| T12 inert | ✅ Done | AD-027 aditivo puro |
| T13 foco/ordem | ✅ Done | — |
| T14 CSS a11y visual | ✅ Done | preview/manual |
| T15 wiring | ✅ Done | build + preview |

---

## Spec-Anchored Acceptance Criteria

### P1: Rotas e posição na URL (LIB-01/02/03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 `/b/:id/p/:n` abre na página `n` | motor abre no spread cujo recto é `n` | `src/routes/__tests__/ReaderRoute.test.tsx:44-47` — `expect(label).toContain("5/10")` | ✅ PASS |
| AC2 virar → substitui histórico | `navigate(..., {replace:true})`; back cai fora, não em `/p/1` | `src/routes/__tests__/ReaderSync.test.tsx:82-88` — vira→`/p/3`, `nav(-1)`→`expect(ctl.path).toBe("/")` | ✅ PASS |
| AC3 back/forward → posição correspondente | motor acompanha a URL | `ReaderSync.test.tsx:97-105` — `nav("/p/9")`→`9/10`, `nav(-1)`→`3/10` | ✅ PASS |
| AC4 `/c/:slug` → redireciona à URL canônica | resolve capítulo → `/p/:n` (replace) | `src/routes/__tests__/ReaderChapter.test.tsx:66-68` — `expect(ctl.path).toBe("/b/${id}/p/5")` | ✅ PASS |
| AC5 `:n` fora do intervalo → clamp sem erro | limita a `[1,maxPage]` | `ReaderChapter.test.tsx:88-89` (`/p/999`→`10/10`), `readerUrl.test.ts:12-27` | ✅ PASS |
| AC6 `/s/:token` → leitura, sem controle de edição no DOM | 0 controles de edição, 0 `contenteditable` | `src/routes/__tests__/ShareRoute.test.tsx:55-62` — `expect(editControls).toHaveLength(0)` | ✅ PASS |

### P1: Estante (LIB-04/05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 lista capa/título/metadados | link por id + "N páginas" + gradiente | `src/routes/__tests__/ShelfRoute.test.tsx:39-55` — href, `getByText(/3 páginas/)`, `cover.style.background` contém `linear-gradient` | ✅ PASS |
| AC2 vazio → ação de criar | link para `/new` + texto vazio | `ShelfRoute.test.tsx:62-64` — `href="/new"` + `/estante está vazia/` | ✅ PASS |
| AC3 carregando → estado, não branco | texto de carregamento síncrono | `ShelfRoute.test.tsx:70-71` — `getByText(/carregando a estante/)` | ✅ PASS |
| AC4 cartão com foco → anel visível | indicador de foco visível | — (visual, jsdom não pinta) | ⚠️ Visual — preview |
| AC5 montagem → nenhum doc completo | 0 chamadas a `getBook` | `ShelfRoute.test.tsx:83-84` — `expect(getBookSpy).not.toHaveBeenCalled()` + `listSpy` chamado | ✅ PASS |

### P1: Troca rápida de volume (LIB-06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 lista os demais como lombadas | outros acionáveis | `src/ui/__tests__/SideMenu.test.tsx:58-70` — Alfa/Gama `toBeEnabled()`, capa presente | ✅ PASS |
| AC2 hover/foco → desliza e revela capa | reveal deslizante | `SideMenu.test.tsx:70` cobre a capa presente; o deslize é CSS | ⚠️ Visual — preview (elemento presente ✅) |
| AC3 aciona → troca sem reload | `navigate` por rota | `SideMenu.test.tsx:79-81` — `expect(loc.path).toBe("/b/${ids.Beta}")` | ✅ PASS |
| AC4 atual marcado | `aria-current`, desabilitado | `SideMenu.test.tsx:65-67` — `aria-current="true"` + `toBeDisabled()` | ✅ PASS |
| AC5 fica fora de `src/live-book/` | irmão do motor | localização `src/ui/SideMenu.tsx` + import `../SideMenu` de `src/ui/__tests__` | ✅ PASS (estrutural) |

### P1: Acessibilidade do leitor (LIB-07/08)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| 07-AC1 nenhum focável sob `aria-hidden` | conjunto vazio; fitas rotuladas | `src/live-book/__tests__/a11y.test.tsx:37-45` — `expect(dentroDeAriaHidden).toEqual([])`; `54-55` `aria-label` truthy | ✅ PASS |
| 07-AC2 foco visível com contraste | outline visível | `src/live-book/a11y.css:7-11` — `outline:3px solid` (visual) | ⚠️ Visual — preview |
| 07-AC3 foco não fica em folha desmontada | reancora fora da folha | `a11y.test.tsx:99-103` — `alvo.isConnected===false`, `activeElement!==alvo`, reancorado conectado | ✅ PASS |
| 08-AC4 ordem de leitura esq→dir | números impressos crescentes no DOM | `a11y.test.tsx:110-112` — `expect(nums).toEqual([...nums].sort())` | ✅ PASS (proxy DOM) |
| 08-AC5 alvo de toque ≥44×44 | `min-width/height:44px` | `a11y.css:15-22` — `.lb-nav`/`.lb-tabs__tab` (visual) | ⚠️ Visual — preview |
| 07-AC6 caracterização Fase 0 verde | faces/toc/window/additive/smoke passam | 5 suítes / 20 testes verdes | ✅ PASS |

**Status**: ✅ Todos os AC automatizáveis cobertos; 4 lacunas visuais (07-AC2, 08-AC5, 04-AC4, 06-AC2) registradas honestamente — não asseridas com valor falso.

---

## Edge Cases

- [x] id inexistente → "não encontrado" + volta à estante — `ReaderRoute.test.tsx:82-90`
- [x] slug inexistente → 1ª página — `ReaderChapter.test.tsx:81-85`, `chapters.test.ts:72-74`
- [x] slug duplicado → primeiro vence (determinístico) — `chapters.test.ts:57-64`
- [x] URL de página não numerada (capa) → posição válida mais próxima — `readerUrl.test.ts:24-27`, `ReaderChapter.test.tsx:92-95`
- [x] volume de uma página só → navega sem estado inválido — `readerUrl.test.ts:53-59`
- [x] side menu com um volume só → informa, não lista vazio — `SideMenu.test.tsx:84-93`

---

## Discrimination Sensor

Mutações em estado descartável (edit → run → revert por `git checkout --`); árvore restaurada exatamente (`git status` limpo ao fim).

| # | File:line | Mutação | Suíte | Killed? |
| - | --------- | ------- | ----- | ------- |
| 1 | `src/routes/readerUrl.ts:34` | `clampInt(n,1,hi)` → `Math.trunc(n)` (remove clamp) | `readerUrl.test.ts` | ✅ Killed (3 failed) |
| 2 | `src/book/chapters.ts:42` | remove guarda `if (seen.has(slug)) return` (last-wins) | `chapters.test.ts` | ✅ Killed |
| 3 | `src/routes/ReaderRoute.tsx:165` | `{replace:true}` → `{replace:false}` | `ReaderSync.test.tsx` | ✅ Killed |
| 4 | `src/routes/ShelfRoute.tsx:26` | injeta `adapter.getBook("mutant")` na montagem | `ShelfRoute.test.tsx` | ✅ Killed |
| 5 | `src/live-book/Leaf.tsx:79` | `offSpread = !(...)` → `(...)` (inverte spread/oclusa) | `a11y.test.tsx` | ✅ Killed |
| 6 | `src/live-book/LiveBook.tsx:710` | re-adiciona `aria-hidden="true"` ao `lb-tabs` | `a11y.test.tsx` | ✅ Killed |

**Sensor depth**: lightweight (6 mutações, alvos de maior risco — clamp, slug, replace, spy da estante, inert, aria-hidden)
**Result**: 6/6 killed — ✅ PASS

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / sem features extras | ✅ |
| Mudanças cirúrgicas | ✅ |
| Sem scope creep | ✅ |
| Segue padrões (CSS `lb-`/`app-`, sem estado global) | ✅ |
| Motor não importa de `book/`/`data/`/`routes/` (invariante 1) | ✅ (tradução URL↔folha só no `ReaderShell`) |
| Conversão face/folha/número só em `units.ts` (invariante 4) | ✅ (`readerUrl`/`chapters` delegam a `units`) |
| AD-022: `Leaf.tsx` só ganhou `inert` derivado; sem geometria/ângulo | ✅ (AD-027) |
| Spec-anchored outcome check (valores asseridos batem com a spec) | ✅ |
| Cobertura por camada (pura 1:1 AC; rotas happy+edge+erro) | ✅ |
| Todo teste mapeia a AC/edge/Done-when — sem testes órfãos | ✅ |
| Diretrizes documentadas seguidas | ✅ `CLAUDE.md`, `docs/testing/strategy.md` (AD-016) |

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run build && npm test`
- **typecheck**: exit 0
- **build**: exit 0 (`vite build` OK; aviso de chunk >500 kB pré-existente, sem relação)
- **test**: 218 passed, 2 skipped, 0 failed (36 suítes passadas + 2 skipped)
- **Skipped (justificados)**: `supabase.auth.test.ts`, `supabase.contract.test.ts` — suítes Supabase ao vivo, skip sem env (esperado; não rodadas ao vivo por instrução)
- **Base esperada**: 218 + 2 skip → confirmada

---

## Requirement Traceability Update

| Requirement | New Status |
| ----------- | ---------- |
| LIB-01 | ✅ Verified |
| LIB-02 | ✅ Verified |
| LIB-03 | ✅ Verified |
| LIB-04 | ✅ Verified (AC4 foco = visual/preview) |
| LIB-05 | ✅ Verified |
| LIB-06 | ✅ Verified (AC2 reveal = visual/preview) |
| LIB-07 | ✅ Verified (AC2 = visual/preview; AC6 Fase 0 verde) |
| LIB-08 | ✅ Verified (AC5 = visual/preview; AC4 por proxy DOM) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: todos os AC automatizáveis batem com o outcome da spec; 4 lacunas puramente visuais registradas (não asseridas com valor falso)
**Sensor**: 6/6 mutações mortas
**Gate**: typecheck 0 · build 0 · 218 passed + 2 skip

**What works**: rotas canônicas por número impresso com clamp; sync URL↔motor com `replace` e guarda anti-laço; `/c/:slug` → redirect canônico; `/s/:token` público sem cromo de edição; estante só com `BookSummary` (0 `getBook`); side menu fora do motor; a11y estrutural (fitas fora de `aria-hidden`, `inert` fora do spread, reancoragem de foco, ordem de leitura); `loadForRender` provado no caminho de carga (AD-026); Fase 0 intacta (AD-027 sem tocar geometria).

**Lacunas conhecidas** (não bloqueiam — jsdom não faz layout/paint):
1. LIB-07 AC2 — contraste do `:focus-visible` (CSS presente em `a11y.css`; confirmar no preview)
2. LIB-08 AC5 — alvo de toque 44×44 (CSS presente; confirmar no preview)
3. LIB-04 AC4 — anel de foco do cartão da estante (o `<a>` usa foco padrão do UA; `a11y.css :focus-visible` é escopado a `.lb-root` e NÃO cobre o cartão — confirmar/estilizar no preview)
4. LIB-06 AC2 — deslize de reveal da lombada (o elemento de capa existe; a animação é CSS)
5. E2E/retrato (Playwright) deferido por ambiente (`npm run shots` quebrado)

**Next steps**: nenhum bloqueante. Sugestão não-bloqueante: no preview, confirmar o anel de foco do `ShelfCard` (lacuna 3) — é a única com risco de o foco padrão do UA ser fraco sobre o gradiente da capa.

---

## Gap resolution (pós-validação)

- **LIB-04 AC4 (lacuna 3, a única com risco real)** — FECHADA no commit `feat(ui): camada visual da estante e side menu, com foco visivel (LIB-04 AC4)`. Havia ausência total de CSS de UI (`app-*` sem folha de estilo). Novo `src/ui/ui.css` (`AD-015`) estiliza estante+side menu e dá `:focus-visible` de contraste a todo controle do produto. **Verificado no preview** (LocalAdapter): Tab até o `ShelfCard` → `outline: 3px solid rgb(59,91,219)` (accent), `:matches(':focus-visible')` = true. Também confirmado no leitor: "Novo volume" e nav com o mesmo anel.
- **Lacunas 1, 2, 4 (LIB-07 AC2, LIB-08 AC5, LIB-06 AC2)** — CSS presente (`a11y.css` + `ui.css`); foco/44px confirmados no preview via `getComputedStyle`. O reveal da lombada (AC2) é transição CSS presente, não exercitável em jsdom.
- **Lacuna 5 (E2E/retrato)** — segue deferida por ambiente (Playwright não fiado). Sem regressão: o pipeline foi exercitado ponta a ponta no preview.

**Estado final**: offline 218 verdes + 2 skip; preview OK (estante→leitor→URL sync→voltar→foco). **Fase 2B fechada.**
