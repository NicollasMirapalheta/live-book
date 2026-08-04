# Fase 2A — Persistência e acesso · Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/fase-2a-persistencia/spec.md`
**Design**: `.specs/features/fase-2a-persistencia/design.md`
**Diff range**: `b2cd08c..HEAD` (17 commits; `cc63a7e` … `7b301c1`)
**Verifier**: independent sub-agent (author ≠ verifier), read-only over the real tree; all sensor mutations ran in disposable state and were reverted.

---

## Verdict

**PASS ✅ — with 2 flagged test-coverage gaps on DATA-04 (auth), routed as recommended fix tasks.**

The implementation is behaviorally correct: every gate is green offline and live, and the discrimination sensor killed all 5 injected faults. The two gaps are *missing negative-path assertions* on DATA-04 (the token-authorization story), not defects — the behavior is enforced by the SQL RPC + RLS and the happy path is exercised live, but no test asserts the *rejection* of a save without/with a wrong token, nor that the public read payload omits `edit_token`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 limites | ✅ Done | `src/config/limits.ts` — 3 constants, SQL mirror documented |
| T2 sanitize | ✅ Done | `src/book/sanitize.ts` (DOMPurify) |
| T3 loadDoc | ✅ Done | `src/book/loadDoc.ts` (migrate→sanitize) |
| T4 editTokens | ✅ Done | `src/data/editTokens.ts` |
| T5 interface+contrato | ✅ Done | `StorageAdapter.ts`, `adapter.contract.ts` |
| T6 LocalAdapter | ✅ Done | full contract green (14) |
| T7 PublicAdapter | ✅ Done | read subset + write-refusal (10) |
| T8 schema.sql | ✅ Done | DDL+view+RLS+5 RPCs, `search_path=''` |
| T9 SupabaseAdapter | ✅ Done | live contract 14/14 |
| T10 pickAdapter | ✅ Done | `src/data/index.ts` (4) |
| T11 check-rls | ✅ Done | 6/6 refused live |

---

## Spec-Anchored Acceptance Criteria

### P1: Contrato de armazenamento (DATA-01)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 contrato passa nos 3 adapters | todos passam nos casos do seu `canWrite` | `src/data/local/__tests__/local.contract.test.ts:7` (full 14); `src/data/public/__tests__/public.contract.test.ts:26` (read subset)+`:34` (write refusal); `src/data/supabase/__tests__/supabase.contract.test.ts:27` (live 14/14) | ✅ PASS |
| AC2 `assetUrl` síncrona → string | retorna string não-vazia, sem await | `adapter.contract.ts:131` — `expect(typeof url).toBe("string")` (call é síncrona, sem `await`) | ✅ PASS |
| AC3 round-trip idêntico + bloco desconhecido | doc estruturalmente idêntico | `adapter.contract.ts:92` — `expect(loaded!.doc).toEqual(doc)`; `:96` — unknown block `toEqual({...diagrama-3d...})` | ✅ PASS |
| AC4 `PublicAdapter` rejeita escrita | rejeita | `public.contract.test.ts:41-61` — 5× `rejects.toBeInstanceOf(WriteForbiddenError)` | ✅ PASS |
| AC5 sem `VITE_SUPABASE_URL` → LocalAdapter | sobe no Local sem erro | `src/data/__tests__/index.test.ts:14` — `expect(pickAdapter({})).toBeInstanceOf(LocalAdapter)` | ✅ PASS |

### P1: Autorização sem login (DATA-04 / DATA-05)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DATA-04 AC1 salvar sem token → recusar | escrita recusada | server: `schema.sql:134` `raise 'forbidden'`; client: `SupabaseAdapter.ts:69` `requireToken` throws. **Nenhum teste exercita a rejeição por token ausente/errado** | ⚠️ Coverage gap |
| DATA-04 AC2 `edit_token` fora da resposta pública | token não consta | estrutural: view `schema.sql:56` omite `edit_token`; `getBook` seleciona só `doc, rev` (`SupabaseAdapter.ts:102`). **Nenhuma asserção de que o payload não contém `edit_token`** | ⚠️ Coverage gap |
| DATA-04 AC3 = DATA-05 AC3 anon insert/update/delete direto → RLS recusa | recusado | `scripts/check-rls.mjs` — 6/6 `permission denied` (executado ao vivo, exit 0) | ✅ PASS |
| DATA-04 AC4 `edit_token` devolvido exatamente uma vez | devolvido na criação, nunca na leitura | `adapter.contract.ts:83-84` — create devolve `editToken`; nenhum método de leitura o devolve (`LoadedBook` = `{doc, rev}`) | ✅ PASS (por construção) |
| DATA-05 AC5 script RLS: 6 operações falham | as 6 falham | `check-rls.mjs:40-47` lista as 6; execução ao vivo: 6/6 recusadas, exit 0 | ✅ PASS |

### P1: Durabilidade (DATA-06 / DATA-07)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DATA-06 AC1 exibir link de resgate | fragmento com id+token | `editTokens.test.ts:50-54` — `link.startsWith("#")`, contém token, `not.toContain("?")`. Instrução "guardar fora do navegador" é UI/2B | ✅ PASS (nível de dado) |
| DATA-06 AC2 link aberto → token restaurado | decode devolve id+token; set persiste | `editTokens.test.ts:45-47` — `decodeRescue` `toEqual({id, token})`; `:18-24` round-trip `set→get→clear` | ✅ PASS |
| DATA-07 AC3 save arquiva antes de sobrescrever | versão anterior no histórico | `adapter.contract.ts:137-144` — `listRevisions` len 0→1, `revisions[0].rev === rev` | ✅ PASS |
| DATA-07 AC4 poda em 20 na mesma transação | histórico == REVISION_CAP | `adapter.contract.ts:146-155` — após CAP+5 saves, `expect(revisions.length).toBe(REVISION_CAP)`; live idem (1545ms) | ✅ PASS |
| DATA-07 AC5 restaurar → estado exato + gera revisão | conteúdo da revisão + rev sobe | `adapter.contract.ts:157-170` — `restored.rev === afterSave.rev+1` e `loaded.doc toEqual(v1)` | ✅ PASS |

### P1: Concorrência (DATA-08)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 save com rev divergente → `RevConflictError`, servidor não altera | erro + estado intacto | `adapter.contract.ts:113-123` — `rejects.toBeInstanceOf(RevConflictError)` + `loaded.rev===rev` + `loaded.doc toEqual(original)` | ✅ PASS |
| AC2 conflito → UI avisa e trava autosave | UI trava | UI/editor = 2B; fora do escopo executável da 2A (design §"Escopo de execução") | ⤴ Out-of-scope (2B) |
| AC3 save bem-sucedido → rev +1 | incremento exato de 1 | `adapter.contract.ts:107` — `expect(saved.rev).toBe(rev+1)`; `:109` recarrega e confere | ✅ PASS |

### P1: Sanitização (DATA-09)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC1 `<script>` não executa | script removido | `sanitize.test.ts:27` — `not.toMatch(/<script/i)` + `not.toContain("alert(1)")` | ✅ PASS |
| AC2 `onerror`/`onload` removidos | atributo removido | `sanitize.test.ts:37` `not.toMatch(/onerror/i)`; `:45` `not.toMatch(/onload/i)` | ✅ PASS |
| AC3 HTML legítimo preservado | formatação/classe mantidas | `sanitize.test.ts:54-58` — contém `lb-prose`, `<h2>`, `<strong>`, `<em>`, `<li>` | ✅ PASS |
| AC4 sanitização no carregamento, antes do render | migrate→sanitize na borda | `loadDoc.test.ts:21-27` — `loadForRender` devolve html sem `<script>` e `readOnly=false` | ✅ PASS |

---

## Edge Cases

| Edge case | Result | Evidence |
| --- | --- | --- |
| Supabase pausado → carregando, não erro | ⚠️ Estrutural (não testável offline; live não pausável) | `SupabaseAdapter.ts:47` mapeia erro de rede em `StorageUnavailableError` |
| doc > 4 MB → recusado | ✅ | `adapter.contract.ts:191` create `TooLargeError`; `:195-204` save recusa sem alterar estado |
| doc > 400 págs → recusado | ✅ | `adapter.contract.ts:185` `rejects.toBeInstanceOf(TooLargeError)` |
| localStorage indisponível → erro explícito | ✅ | `editTokens.test.ts:36-41` — `toThrow(/localStorage indisponivel/)` nos 3 métodos |
| volume apagado, link antigo → null (não erro) | ✅ | `adapter.contract.ts:125-129` delete→getBook null; live idem |
| duas abas, 2ª a salvar → conflito | ✅ | mesmo mecanismo de `RevConflictError` (`adapter.contract.ts:113`) |
| schemaVersion futura → somente-leitura | ✅ | `loadDoc.test.ts:29-41` — `readOnly===true`, campos futuros preservados, ainda sanitizado (save-disable é UI/2B) |

---

## Discrimination Sensor

Faults injected in disposable state (Edit → run → `git checkout --`), never committed.

| # | File:line | Mutation | Tests run | Killed? |
| - | --------- | -------- | --------- | ------- |
| 1 | `LocalAdapter.ts:114` | conflito de `rev`: `!==` → `===` | `src/data/local` | ✅ Killed (5 failed) |
| 2 | `LocalAdapter.ts:129` | poda off-by-one: `- REVISION_CAP` → `- REVISION_CAP - 1` (deixa 21) | `src/data/local` | ✅ Killed (DATA-07 AC4) |
| 3 | `sanitize.ts:26` | bypass do DOMPurify (retorna html cru) | `sanitize`+`loadDoc` | ✅ Killed (7 failed) |
| 4 | `loadDoc.ts:29` | remove passo `sanitizeDoc` da composição | `loadDoc` | ✅ Killed (2 failed) |
| 5 | `SupabaseAdapter.ts:99` (live) | remove guard de UUID em `getBook` | `src/data/supabase` (live) | ✅ Killed (getBook id inexistente) |

**Sensor depth**: lightweight fault-injection, 5 mutations spanning the highest-risk new code (conflito, poda, sanitização, composição, guard).
**Result**: 5/5 killed — **PASS ✅**

> Não foi possível injetar mutação de caminho-negativo de token (save com token errado) sem alterar o schema SQL ao vivo (proibido no modo read-only). Essa lacuna é registrada como gap de cobertura DATA-04, não como mutante sobrevivente.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code / no scope creep | ✅ — App segue no `demoDoc` (design §escopo); adapters não vazam SDK |
| Surgical changes | ✅ |
| Matches patterns/style | ✅ — CSS/prefix N/A; segue camadas L1–L3 de `docs/testing/strategy.md` |
| Nenhum import de `@supabase/supabase-js` fora de `src/data/supabase/` | ✅ — grep confirma: só `client.ts`, `SupabaseAdapter` (type), `check-rls.mjs`, teste live |
| `assetUrl` síncrona nos 3 adapters | ✅ — sem `Promise` em nenhuma das 3 assinaturas |
| Spec-anchored outcome check | ✅ (2 gaps DATA-04 sinalizados) |
| Todo teste mapeia a uma AC/edge/done-when — sem testes órfãos | ✅ |
| Diretrizes documentadas seguidas | ✅ — `docs/testing/strategy.md` (`AD-016`: teste deriva do AC, não espelha impl.) |

---

## Gate Check

| Gate | Command | Result |
| ---- | ------- | ------ |
| Offline (Quick/Full) | `npx vitest run` | **152 passed + 1 skipped** (Supabase live, pulado sem env) ✅ |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| Build | `npm run build` (`tsc -b && vite build`) | ✅ 459 módulos, built em ~1.4s |
| Live — contrato Supabase | `SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… vitest run src/data/supabase` | **14/14 passed** ✅ |
| Live — RLS | `node scripts/check-rls.mjs` | **6/6 recusadas**, exit 0 ✅ |

- **Skipped**: 1 — `supabase.contract.test.ts` offline (opt-in ao vivo, justificado por `describe.skip`); passa 14/14 quando as credenciais estão presentes.
- **Delta**: +46 testes offline novos (sanitize 8, loadDoc 4, editTokens 6, index 4, local.contract 14, public.contract 10) + 14 live. Nenhum teste removido ou enfraquecido.

---

## Fix Plans (recommended, non-blocking)

### Fix 1 — DATA-04 AC1: asserção de rejeição de save sem/com token errado (rank #1)

- **Root cause**: a suíte de contrato sempre possui o `edit_token` local válido após `createBook`; o caminho de rejeição (`save_book` `raise 'forbidden'` / `requireToken` throw) nunca é exercitado por asserção.
- **Fix task**: adicionar teste live no `supabase.contract.test.ts` que cria um volume, apaga/substitui o token local (`clearEditToken` ou stub) e espera que `saveBook` rejeite; opcional: teste offline análogo se um adapter simular token.
- **Priority**: Major (é a garantia central da história P1 "só eu consigo editar").

### Fix 2 — DATA-04 AC2: asserção de que a leitura pública não expõe `edit_token` (rank #2)

- **Root cause**: nenhuma asserção confirma que o payload da view/`getBook` não contém `edit_token`; hoje é garantido só por construção (definição da view + lista de `select`).
- **Fix task**: teste live que consulta `books_public` (ou `getBook`) e afirma que `edit_token`/`owner_id` não estão presentes nas chaves retornadas.
- **Priority**: Minor (RLS já impede leitura direta da tabela; risco residual baixo).

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| DATA-01 | Done | ✅ Verified |
| DATA-02 | Done | ✅ Verified |
| DATA-03 | Done | ✅ Verified |
| DATA-04 | Done | ⚠️ Verified com gap de cobertura (AC1, AC2) |
| DATA-05 | Done | ✅ Verified (live 6/6) |
| DATA-06 | Done | ✅ Verified |
| DATA-07 | Done | ✅ Verified (live inclusive) |
| DATA-08 | Done | ✅ Verified (AC2 é 2B) |
| DATA-09 | Done | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready — com 2 fix tasks recomendadas (não bloqueantes) sobre asserções de autorização por token.

**Spec-anchored check**: 24/26 ACs aplicáveis batem o outcome da spec; 2 gaps de cobertura em DATA-04; 1 AC (DATA-08 AC2) é escopo de 2B.
**Sensor**: 5/5 mutações mortas.
**Gate**: offline 152✅+1 skip; typecheck ✅; build ✅; live contrato 14/14 ✅; RLS 6/6 ✅.

**O que funciona**: contrato único verde nos 3 adapters (Local/Public offline, Supabase ao vivo); round-trip fiel incluindo bloco desconhecido; conflito de `rev`; histórico com poda em 20 e restauração exata; sanitização na borda de carga; RLS negando as 6 escritas diretas; seleção de adapter por env.

**Issues**: DATA-04 AC1/AC2 sem asserção de caminho-negativo (token) — ver Fix Plans.

**Next steps**: rotear Fix 1 e Fix 2 como fix tasks; a fiação de `loadForRender`/rejeição-de-conflito na UI e o save-disable de somente-leitura entram na 2B (já registrado na spec).

---

## Gap resolution (pós-validação)

As duas lacunas de DATA-04 foram fechadas no commit `test(data): cobrir recusa por token e omissao de edit_token (DATA-04)`, sem tocar no comportamento (só cobertura):

- **DATA-04 AC1** (era Major) — `src/data/supabase/__tests__/supabase.auth.test.ts`: save com `edit_token` errado e depois ausente é recusado, e `getBook` confirma `rev`/doc intactos (nenhuma sobrescrita). Exercita o `raise 'forbidden'` do `save_book` e o guard `requireToken`. ✅ ao vivo.
- **DATA-04 AC2** (era Minor) — mesmo arquivo: `select *` em `books_public` e assert de que `edit_token`/`owner_id` não constam das chaves. ✅ ao vivo.

**Estado ao vivo após o fix**: contrato Supabase 16/16 (14 + 2 auth); `check-rls` 6/6. Offline: 152 verdes + 2 skip. **Fase 2A fechada.**
