# Fase 2A — Persistência e acesso · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo
Execute e as Critical Rules dela.** Não busque arquivos da skill por caminho de sistema.
A skill é a fonte de verdade do fluxo (ciclo por task, delegação a sub-agentes, revisão de
adequação, Verifier, sensor de discriminação).

**Se a skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

---

**Design**: `.specs/features/fase-2a-persistencia/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada de código + diretrizes + spec — confirmar antes do Execute. Diretrizes encontradas:
> `CLAUDE.md`, `docs/testing/strategy.md` (camadas L1–L5, `AD-016`), `vitest.config.ts`.
> Amostra de testes existentes: `src/book/**/__tests__/*.test.ts(x)`, `src/live-book/__tests__/*`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| Função pura / lógica de domínio (`sanitize`, `loadDoc`, `editTokens`, `pickAdapter`) | unit | Todos os ramos; 1:1 com os AC da spec; toda edge case listada | `src/**/__tests__/*.test.ts` | `npm test` |
| Contrato do `StorageAdapter` (Local, Public) | unit (contrato) | Suíte única roda contra cada adapter gravável offline; round-trip fiel inclui bloco desconhecido | `src/data/__tests__/*.test.ts` | `npm test` |
| `SupabaseAdapter` (sobre Postgres) | unit (contrato) **opt-in, ao vivo** | Mesma suíte, pulada quando `SUPABASE_TEST_URL` ausente; roda contra o projeto real | `src/data/supabase/__tests__/*.test.ts` | `SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… npm test` |
| SQL (`schema.sql`) | none no vitest | Verificado ao vivo por `check-rls.mjs` + contrato Supabase; não roda em jsdom | `src/data/supabase/schema.sql` | build gate + verificação ao vivo |
| Script de verificação (`check-rls.mjs`) | none (é o próprio verificador) | Recusa as 6 operações proibidas contra o projeto real | `scripts/check-rls.mjs` | `node scripts/check-rls.mjs` (com env) |
| Interface / tipos / erros / config (`StorageAdapter.ts`, `limits.ts`) | none | Sem comportamento; gate de build | `src/data/StorageAdapter.ts`, `src/config/limits.ts` | build gate |

**Nota de gate honesto:** o `npm test` (offline) prova Local + Public + toda unidade. O lado
**Supabase (SQL, adapter, RLS) exige o projeto real do autor** — env + `schema.sql` aplicado.
Essa verificação ao vivo é opt-in e roda no Execute quando o autor fornecer as credenciais.

## Gate Check Commands

> Confirmar antes do Execute.

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | Após tasks com unit/contrato offline | `npm test` |
| Full | Igual ao Quick nesta fase (E2E Playwright é L5, fora do escopo da 2A) | `npm test` |
| Build | Fim de fase / tasks de config/SQL/interface | `npm run typecheck && npm run build && npm test` |
| Live (opt-in) | Validar SQL + `SupabaseAdapter` + RLS | `SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… npm test` **e** `node scripts/check-rls.mjs` |

---

## Execution Plan

Fases ordenadas, sequenciais; tasks dentro da fase em ordem.

### Phase 1: Núcleo puro offline

Constantes, sanitização, carga e tokens — tudo testável sem rede.

```
T1 → T2 → T3 → T4
```

### Phase 2: Contrato + adapters graváveis offline

A interface, a suíte de contrato única e as duas implementações que rodam offline.

```
T5 → T6 → T7
```

### Phase 3: Backend Supabase (verificação ao vivo)

DDL/RLS/RPCs, o adapter remoto, a seleção por env e o verificador de RLS.

```
T8 → T9 → T10 → T11
```

---

## Task Breakdown

### T1: Constantes de limite

**What**: `MAX_PAGES=400`, `MAX_DOC_BYTES=4*1024*1024`, `REVISION_CAP=20` (`AD-025`), com JSDoc apontando que o SQL espelha os valores.
**Where**: `src/config/limits.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: dimensões implícitas (Validação e limites)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Três constantes exportadas com os valores acima
- [ ] `npm run typecheck` passa
- [ ] `git` commit atômico

**Tests**: none · **Gate**: build

---

### T2: Sanitização de HTML

**What**: `sanitizeDoc(doc)` percorre blocos `text`/`callout` e passa `html` por DOMPurify (allowlist de formatação; remove `<script>` e atributos `on*`), preservando blocos desconhecidos intactos. Adiciona dep `dompurify` (+ `@types/dompurify`).
**Where**: `src/book/sanitize.ts`
**Depends on**: None (usa `schema.ts` existente)
**Reuses**: `src/book/schema.ts` (`Block`, `BookDoc`)
**Requirement**: DATA-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `<script>` em bloco `text` não sobrevive à sanitização (DATA-09 AC1)
- [ ] `onerror`/`onload` removidos (AC2)
- [ ] HTML legítimo de formatação preservado (AC3)
- [ ] Bloco de `type` desconhecido passa intacto
- [ ] Gate `npm test` passa; contagem de testes registrada
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T3: Borda de carga para render

**What**: `loadForRender(raw)` = `migrateDoc(raw)` → `sanitizeDoc(doc)`, devolvendo `{ doc, readOnly }`. Sanitiza **antes** do primeiro render (DATA-09 AC4) e propaga `readOnly` da versão futura.
**Where**: `src/book/loadDoc.ts`
**Depends on**: T2
**Reuses**: `src/book/migrate.ts` (`migrateDoc`), `src/book/sanitize.ts`
**Requirement**: DATA-09, `AD-026`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Compõe migrate → sanitize na ordem certa
- [ ] Documento de `schemaVersion` futura volta com `readOnly=true` e sem perder campos (edge case)
- [ ] Bloco desconhecido sobrevive
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T4: Token de edição e link de resgate

**What**: `getEditToken/setEditToken/clearEditToken(bookId)` sobre `localStorage`, e `encodeRescue(id, token)`/`decodeRescue(hash)` (token no **fragmento**, nunca query string). `localStorage` indisponível → erro explícito.
**Where**: `src/data/editTokens.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: DATA-06 (`AD-017`)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Round-trip set→get→clear por id (DATA-06)
- [ ] `encodeRescue`/`decodeRescue` restauram o token (AC1, AC2)
- [ ] `localStorage` indisponível lança erro explícito, não silencioso (edge case)
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T5: Interface `StorageAdapter` + suíte de contrato

**What**: `StorageAdapter.ts` (métodos, `BookSummary`/`CreateResult`/`SaveResult`/`LoadedBook`/`RevisionMeta`, erros `RevConflictError`/`NotFoundError`/`TooLargeError`/`WriteForbiddenError`/`StorageUnavailableError`) e `adapter.contract.ts` exportando `runAdapterContract(name, make)` — o corpo de teste único, ainda não invocado.
**Where**: `src/data/StorageAdapter.ts`, `src/data/__tests__/adapter.contract.ts`
**Depends on**: None
**Reuses**: `src/book/schema.ts`, `src/book/factory.ts`, `src/demo/demoDoc.ts` (fixture com bloco desconhecido)
**Requirement**: DATA-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Interface + tipos + erros exportados conforme o design
- [ ] `runAdapterContract` cobre: `createBook` id+rev; `getBook` sem perda (inclui bloco desconhecido); `saveBook` conflito de `rev`; `deleteBook`→`getBook`=null; `assetUrl` síncrona; `gcAssets` preserva em uso; restaurar revisão
- [ ] `npm run typecheck` passa (suíte compila, roda a partir da T6)
- [ ] Commit atômico

**Tests**: none (infraestrutura; roda a partir da T6) · **Gate**: build

---

### T6: `LocalAdapter` (IndexedDB) + contrato verde

**What**: `LocalAdapter` sobre IndexedDB (via `idb`), `canWrite=true`, com `rev`/conflito/histórico (poda 20) e validação de limites; `assetUrl` devolve `ref.id`. Importa `fake-indexeddb` no setup e invoca `runAdapterContract("local", makeLocal)`. Adiciona deps `idb` e `fake-indexeddb` (dev).
**Where**: `src/data/local/LocalAdapter.ts`, `src/test/setup.ts` (fake-indexeddb), `src/data/local/__tests__/local.contract.test.ts`
**Depends on**: T5, T1
**Reuses**: `adapter.contract.ts`, `src/config/limits.ts`
**Requirement**: DATA-01, DATA-02, DATA-03, DATA-07, DATA-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `runAdapterContract("local", …)` inteiro passa
- [ ] `saveBook` com `rev` divergente lança `RevConflictError` sem alterar estado (DATA-08)
- [ ] Histórico poda para 20 e restaurar devolve conteúdo exato + gera nova revisão (DATA-07)
- [ ] Documento > 4 MB ou > 400 págs → `TooLargeError` (edge case)
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: unit (contrato) · **Gate**: quick

---

### T7: `PublicAdapter` (somente leitura)

**What**: `PublicAdapter`, `canWrite=false`; leitura via fonte semeada; toda escrita rejeita com `WriteForbiddenError`. Invoca o subconjunto de leitura do contrato e assegura a recusa de escrita.
**Where**: `src/data/public/PublicAdapter.ts`, `src/data/public/__tests__/public.contract.test.ts`
**Depends on**: T5, T6
**Reuses**: `adapter.contract.ts`, `LocalAdapter` (backing de leitura semeado nos testes)
**Requirement**: DATA-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Subconjunto de leitura do contrato passa
- [ ] `createBook`/`saveBook`/`deleteBook`/`restoreRevision` rejeitam com `WriteForbiddenError` (DATA-03 AC4)
- [ ] `assetUrl` síncrona devolve string
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: unit (contrato) · **Gate**: quick

---

### T8: Esquema Postgres (DDL, RLS, view, RPCs)

**What**: `schema.sql` com tabelas `books` e `book_revisions`, view `books_public` (sem `edit_token`/`owner_id`), RLS negando escrita direta a `anon`, e RPCs `security definer` (`set search_path = ''`): `create_book`, `save_book` (checa token+`rev` `for update`, arquiva, **poda 20**, valida limites), `restore_revision`, `delete_book`, `claim_book` inerte. Limites espelham `limits.ts` (com comentário).
**Where**: `src/data/supabase/schema.sql`
**Depends on**: T1
**Reuses**: valores de `src/config/limits.ts` (espelhados)
**Requirement**: DATA-04, DATA-05, DATA-07, DATA-08

**Tools**: MCP: NONE · Skill: NONE · **Autor aplica o SQL no editor do Supabase**

**Done when**:
- [ ] DDL + view + RLS + 5 RPCs presentes, idempotente o suficiente para reaplicar
- [ ] Toda RPC `security definer` fixa `search_path`
- [ ] `npm run typecheck && npm run build` passam (não altera TS)
- [ ] Verificação ao vivo delegada à T9/T11 (needs env do autor)
- [ ] Commit atômico

**Tests**: none (SQL; verificado ao vivo em T9/T11) · **Gate**: build

---

### T9: `SupabaseAdapter` + client

**What**: `client.ts` (singleton do SDK a partir de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) e `SupabaseAdapter` implementando `StorageAdapter` via RPCs + view `books_public`; `assetUrl` monta URL pública síncrona (`AD-013`). Contrato Supabase **opt-in**: pulado quando `SUPABASE_TEST_URL` ausente. Adiciona dep `@supabase/supabase-js`. **Nenhum import do SDK fora de `src/data/supabase/`.**
**Where**: `src/data/supabase/client.ts`, `src/data/supabase/SupabaseAdapter.ts`, `src/data/supabase/__tests__/supabase.contract.test.ts`
**Depends on**: T5, T8
**Reuses**: `adapter.contract.ts`, `schema.sql` (RPCs)
**Requirement**: DATA-01, DATA-04, DATA-05, DATA-07, DATA-08

**Tools**: MCP: NONE · Skill: NONE · **Env do autor + `schema.sql` aplicado para o contrato ao vivo**

**Done when**:
- [ ] `SupabaseAdapter` implementa toda a interface; `assetUrl` síncrona
- [ ] Contrato opt-in passa contra o projeto real quando env presente; pulado (não falho) quando ausente
- [ ] `edit_token` nunca volta por leitura (DATA-04 AC2, via `books_public`)
- [ ] Nenhum `import` de `@supabase/supabase-js` fora de `src/data/supabase/`
- [ ] Gate `npm test` passa (contrato Supabase pulado offline); Build passa
- [ ] Commit atômico

**Tests**: unit (contrato, opt-in ao vivo) · **Gate**: build (+ Live quando env presente)

---

### T10: Seleção de adapter por ambiente

**What**: `pickAdapter()` devolve `SupabaseAdapter` quando `VITE_SUPABASE_URL` presente, senão `LocalAdapter`; `/s/:token` (2B) usará `PublicAdapter`.
**Where**: `src/data/index.ts`
**Depends on**: T6, T9
**Reuses**: `LocalAdapter`, `SupabaseAdapter`
**Requirement**: DATA-01 (AC5)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `VITE_SUPABASE_URL` ausente → `LocalAdapter` sem erro (DATA-01 AC5)
- [ ] `VITE_SUPABASE_URL` presente → `SupabaseAdapter`
- [ ] Gate `npm test` passa; contagem registrada
- [ ] Commit atômico

**Tests**: unit · **Gate**: quick

---

### T11: Verificador de RLS

**What**: `check-rls.mjs` conecta como `anon` e assegura que as **seis** operações proibidas falham: insert/update/delete em `books` e insert/update/delete em `book_revisions`. Sai != 0 se alguma passar.
**Where**: `scripts/check-rls.mjs`
**Depends on**: T8
**Reuses**: `@supabase/supabase-js` (client anon)
**Requirement**: DATA-05 (AC5)

**Tools**: MCP: NONE · Skill: NONE · **Env do autor + `schema.sql` aplicado**

**Done when**:
- [ ] Roda contra o projeto real e vê as 6 operações serem recusadas
- [ ] Sai com código != 0 se qualquer proibida passar
- [ ] `npm run build` passa (script não entra no bundle)
- [ ] Commit atômico

**Tests**: none (é o verificador) · **Gate**: build (+ execução ao vivo)

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2 ──→ T3 ──→ T4
Phase 2:  T5 ──→ T6 ──→ T7
Phase 3:  T8 ──→ T9 ──→ T10 ──→ T11
```

11 tasks → empacotam em ~2 batches (~7/worker) → **oferta de sub-agentes no Execute**.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1 limites | 1 arquivo de constantes | ✅ |
| T2 sanitize | 1 função | ✅ |
| T3 loadDoc | 1 função (composição) | ✅ |
| T4 editTokens | 1 módulo utilitário coeso | ✅ |
| T5 interface + contrato | 1 interface + 1 suíte (coesos) | ✅ |
| T6 LocalAdapter | 1 adapter + invocação do contrato | ✅ |
| T7 PublicAdapter | 1 adapter + invocação do contrato | ✅ |
| T8 schema.sql | 1 artefato SQL | ✅ |
| T9 SupabaseAdapter | 1 client + 1 adapter (coesos) | ✅ |
| T10 pickAdapter | 1 função | ✅ |
| T11 check-rls | 1 script | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
|---|---|---|---|
| T1 | None | início Fase 1 | ✅ |
| T2 | None | (independente) | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | None | (independente, na Fase 1) | ✅ |
| T5 | None | início Fase 2 | ✅ |
| T6 | T5, T1 | T5→T6 (T1 fase anterior) | ✅ |
| T7 | T5, T6 | T6→T7 | ✅ |
| T8 | T1 | início Fase 3 (T1 fase anterior) | ✅ |
| T9 | T5, T8 | T8→T9 (T5 fase anterior) | ✅ |
| T10 | T6, T9 | T9→T10 (T6 fase anterior) | ✅ |
| T11 | T8 | T10→T11 no fluxo; dep real T8 (fase anterior) | ✅ |

> Todas as dependências apontam para trás ou dentro da fase. Nenhuma para fase posterior.

## Test Co-location Validation

| Task | Camada criada | Matriz exige | Task diz | Status |
|---|---|---|---|---|
| T1 | config | none | none | ✅ |
| T2 | função pura | unit | unit | ✅ |
| T3 | função pura | unit | unit | ✅ |
| T4 | função pura | unit | unit | ✅ |
| T5 | interface + infra de teste | none | none | ✅ (sem comportamento; contrato roda em T6+) |
| T6 | adapter (contrato) | unit | unit | ✅ |
| T7 | adapter (contrato) | unit | unit | ✅ |
| T8 | SQL | none (vitest) | none | ✅ (verificado ao vivo em T9/T11) |
| T9 | adapter Supabase | unit (opt-in ao vivo) | unit | ✅ |
| T10 | função pura | unit | unit | ✅ |
| T11 | script verificador | none | none | ✅ (é o próprio teste) |
