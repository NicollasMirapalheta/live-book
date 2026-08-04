# Fase 0 — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome** e siga o fluxo
Execute e as Critical Rules dela. Não procure os arquivos da skill por caminho de sistema.

**Se a skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

> Nota deste projeto: a skill foi instalada em `.claude/skills/` durante a sessão de
> planejamento e só é registrada num start novo do Claude Code. Se `Skill: tlc-spec-driven`
> falhar, reinicie a sessão antes de executar.

---

**Spec**: `.specs/features/fase-0-fundacao/spec.md`
**Design**: pulado — a fase não tem decisão arquitetural (as fórmulas já estão em
[ADR-006](../../../docs/adr/006-unidades-de-paginacao-como-tipos-distintos.md) e na
[linguagem ubíqua](../../../docs/domain/ubiquitous-language.md))
**Status**: Draft

---

## Test Coverage Matrix

> Gerada a partir do código, das diretrizes do projeto e da spec — confirmar antes do Execute.
> Diretrizes encontradas: `CLAUDE.md`, `docs/testing/strategy.md`, `.specs/STATE.md` (AD-016).
> Não há testes no repositório: a stack foi definida com o usuário (Vitest agora,
> Playwright a partir da Fase 3).

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
|---|---|---|---|---|
| Configuração de build e teste | none | apenas gate de build | `vitest.config.ts`, `package.json` | `npm run typecheck && npm run build` |
| Infra de ambiente de teste | unit | teste-sentinela provando que o stub está ativo | `src/test/*.test.ts` | `npm run test` |
| Função pura de domínio | unit | todas as fórmulas 1:1 com os AC; **todos** os casos de borda listados na spec | `src/book/__tests__/*.test.ts` | `npm run test` |
| Suíte de caracterização do motor | unit (render) | todo AC de FUND-05 a FUND-07 + casos de borda | `src/live-book/__tests__/*.test.tsx` | `npm run test` |

> **Nota sobre T5–T7:** nestas tasks o *entregável é o próprio teste* — a fase existe para
> produzir a rede de segurança, não código de produto. A regra de co-locação ("testes não
> são tasks separadas") continua valendo para as demais tasks e para todas as fases seguintes.

## Gate Check Commands

| Nível | Quando usar | Comando |
|---|---|---|
| Quick | após task com testes unitários | `npm run test` |
| Full | *(não se aplica nesta fase — sem e2e antes da Fase 3)* | — |
| Build | fim de fase, ou task só de configuração | `npm run typecheck && npm run build && npm run test` |

---

## Execution Plan

### Phase 1: Infraestrutura

```
T1 → T2
```

### Phase 2: Unidades de paginação

```
T3
```

### Phase 3: Caracterização do motor

```
T4 ─┬→ T5
    ├→ T6
    └→ T7
```

---

## Task Breakdown

### T1: Configurar Vitest

**What**: adicionar as dependências de teste e a configuração, sem escrever teste ainda.
**Where**: `package.json`, `vitest.config.ts`, `tsconfig.app.json`
**Depends on**: None
**Reuses**: `vite.config.ts` — mesmo `@vitejs/plugin-react` e mesma resolução de módulos
**Requirement**: FUND-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `vitest`, `jsdom`, `@testing-library/react` e `@testing-library/jest-dom` em `devDependencies`
- [ ] `vitest.config.ts` com `environment: "jsdom"`, `globals: true` e `setupFiles`
- [ ] Scripts `test` (`vitest run`) e `test:watch` (`vitest`) em `package.json`
- [ ] `tsconfig.app.json` inclui os arquivos de teste, para o typecheck cobri-los
- [ ] `npx vitest run --passWithNoTests` sai com código 0 (prova que a configuração carrega)
- [ ] Gate: `npm run typecheck && npm run build && npm run test`

**Tests**: none · **Gate**: build
**Commit**: `chore(test): configurar vitest com ambiente jsdom`

---

### T2: Criar setup de ambiente de teste

**What**: stub de `ResizeObserver` no setup global, com teste-sentinela que prova que está ativo.
**Where**: `src/test/setup.ts`, `src/test/setup.test.ts`
**Depends on**: T1
**Reuses**: nada — é infraestrutura nova
**Requirement**: FUND-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `ResizeObserver` definido em `globalThis` antes de cada suíte, com `observe`, `unobserve` e `disconnect`
- [ ] `AudioContext` **não** é stubado — `usePageSound` já degrada sozinho ([usePageSound.ts:27](../../../src/live-book/usePageSound.ts)); registrar isso em comentário para ninguém "consertar" depois
- [ ] Teste-sentinela instancia `ResizeObserver`, chama `observe` e `disconnect` sem lançar
- [ ] Gate: `npm run test`
- [ ] Test count: 2 testes passando (sem deleções silenciosas)

**Tests**: unit · **Gate**: quick
**Commit**: `test: adicionar setup de ambiente com stub de ResizeObserver`

---

### T3: Criar `units.ts` com branded types e conversões

**What**: os três branded types, os construtores e as quatro conversões canônicas, com testes tabelados.
**Where**: `src/book/units.ts`, `src/book/__tests__/units.test.ts`
**Depends on**: T2
**Reuses**: fórmulas canônicas de [ubiquitous-language.md](../../../docs/domain/ubiquitous-language.md#conversões-canônicas)
**Requirement**: FUND-03, FUND-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `FaceIndex`, `LeafIndex` e `PageNumber` exportados como branded types
- [ ] Construtores explícitos `asFace`, `asLeaf`, `asPageNumber` (a única porta de entrada de números não tipados)
- [ ] `leafOfFace`, `leafOfPageNumber`, `faceOfPageNumber` e `pageNumberOfFace` implementadas
- [ ] `pageNumberOfFace` devolve `null` para `f < 2` (face de casca), conforme assunção da spec
- [ ] Teste tabelado cobrindo `leafOfFace` de 0 a 5 e `leafOfPageNumber` de 1 a 4, com valor esperado explícito por linha
- [ ] Teste de ida-e-volta: `pageNumberOfFace(faceOfPageNumber(n)) === n` para `n` de 1 a 50
- [ ] Teste de incompatibilidade de tipo usando `@ts-expect-error` (falha o typecheck se a incompatibilidade sumir)
- [ ] Casos de borda da spec cobertos: `leafOfFace(0) = 0`, `pageNumberOfFace(1) = null`
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 12 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `feat(book): adicionar unidades de paginação tipadas e conversões`

---

### T4: Criar helper de montagem para caracterização

**What**: `renderBook(n, opts)` que monta o `LiveBook` com n páginas e expõe consultas ao DOM.
**Where**: `src/live-book/__tests__/renderBook.tsx`
**Depends on**: T2
**Reuses**: `LiveBook` e `Page` pelo barrel `src/live-book/index.ts` — **sempre pela API pública**
**Requirement**: FUND-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `renderBook(n)` monta o componente sem lançar, com `sound={false}`
- [ ] Expõe `leaves()`, `mountedLeaves()`, `faceKinds()`, `tocEntries()` e `printedNumbers()`
- [ ] **Os seletores CSS são lidos de `LiveBook.tsx` e `live-book.css` no momento da implementação — não invente nomes de classe.** Se um seletor necessário não existir, o helper deriva do que existe em vez de exigir mudança no motor
- [ ] Nenhum arquivo fora de `src/live-book/__tests__/` é alterado
- [ ] Gate: `npm run test`
- [ ] Test count: 1 teste de smoke do próprio helper

**Tests**: unit · **Gate**: quick
**Commit**: `test(live-book): adicionar helper de montagem para caracterização`

---

### T5: Caracterizar montagem de faces, enchimento e `leaves`

**What**: testes que fixam a sequência de faces e a contagem de folhas.
**Where**: `src/live-book/__tests__/faces.test.tsx`
**Depends on**: T4
**Requirement**: FUND-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Sequência capa → guarda → N páginas → guarda → contracapa verificada para N par
- [ ] Face de enchimento inserida exatamente uma vez quando o total seria ímpar
- [ ] `leaves === faces.length / 2`
- [ ] Borda: miolo com 0 páginas monta só a casca, com `leaves === 2`
- [ ] Borda: miolo com 1 página recebe enchimento
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 5 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `test(live-book): caracterizar montagem de faces e folhas`

---

### T6: Caracterizar sumário e numeração

**What**: testes que fixam a derivação do sumário e o número impresso.
**Where**: `src/live-book/__tests__/toc.test.tsx`
**Depends on**: T4
**Requirement**: FUND-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Página com `chapter` aparece no sumário associada à folha `ceil(f / 2)`
- [ ] O teste usa `leafOfFace` de `src/book/units.ts` para calcular o esperado — **amarra a fórmula ao motor real** e é o que teria pego o bug da v1
- [ ] Primeira página de miolo tem número impresso 1
- [ ] Borda: nenhuma página com `chapter` produz sumário vazio, sem erro
- [ ] Gate: `npm run test`
- [ ] Test count: ≥ 4 testes passando

**Tests**: unit · **Gate**: quick
**Commit**: `test(live-book): caracterizar sumário e numeração impressa`

---

### T7: Caracterizar janela de virtualização

**What**: testes que fixam quantas folhas ficam montadas.
**Where**: `src/live-book/__tests__/window.test.tsx`
**Depends on**: T4
**Requirement**: FUND-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Com `windowRadius = 2` e 40 páginas, no máximo 7 folhas montadas no DOM
- [ ] Capa e contracapa permanecem montadas mesmo fora da janela
- [ ] Borda: `windowRadius = 0` aplica o piso 1 (o spread precisa de duas folhas)
- [ ] **Fecho de fase:** `git diff --stat src/live-book/` vazio, exceto o diretório `__tests__/` novo (FUND-07 AC 7)
- [ ] Gate: `npm run typecheck && npm run build && npm run test`
- [ ] Test count: ≥ 3 testes passando

**Tests**: unit · **Gate**: build
**Commit**: `test(live-book): caracterizar janela de virtualização`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ──→ T2
Phase 2:  T3                    (depende de T2)
Phase 3:  T4 ─┬──→ T5           (T4 depende de T2)
              ├──→ T6
              └──→ T7
```

Total: 7 tasks — cabe num único batch (~7 por worker), então o Execute roda inline, sem
sub-agentes.

---

## Task Granularity Check

| Task | Escopo | Status |
|---|---|---|
| T1: Configurar Vitest | 1 config + manifesto | ✅ Granular |
| T2: Setup de ambiente | 1 arquivo de setup + sentinela | ✅ Granular |
| T3: `units.ts` | 1 módulo coeso (3 tipos + 4 funções) | ✅ Granular |
| T4: Helper de montagem | 1 helper | ✅ Granular |
| T5: Faces e folhas | 1 arquivo de teste, 1 tema | ✅ Granular |
| T6: Sumário e numeração | 1 arquivo de teste, 1 tema | ✅ Granular |
| T7: Janela | 1 arquivo de teste, 1 tema | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama mostra | Status |
|---|---|---|---|
| T1 | None | sem seta de entrada | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 (entre fases) | ✅ |
| T4 | T2 | T2 → T4 (entre fases) | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T4 | T4 → T6 | ✅ |
| T7 | T4 | T4 → T7 | ✅ |

Nenhuma task depende de fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task declara | Status |
|---|---|---|---|---|
| T1 | Configuração de build e teste | none | none | ✅ |
| T2 | Infra de ambiente de teste | unit | unit | ✅ |
| T3 | Função pura de domínio | unit | unit | ✅ |
| T4 | Suíte de caracterização (helper) | unit | unit | ✅ |
| T5 | Suíte de caracterização | unit | unit | ✅ |
| T6 | Suíte de caracterização | unit | unit | ✅ |
| T7 | Suíte de caracterização | unit | unit | ✅ |

Nenhuma violação. Nenhum `Tests: none` fora da camada de configuração.

---

## Riscos desta fase

| Risco | Impacto | Mitigação |
|---|---|---|
| Seletores CSS dos testes acoplam a suíte ao markup do motor | mudança cosmética quebra teste que deveria ser estrutural | T4 concentra **todos** os seletores no helper; os testes nunca consultam o DOM direto |
| jsdom não faz layout, então `scale` fica no valor estimado | testes não podem verificar geometria | escopo é estrutural por decisão da spec; geometria fica para o e2e da Fase 3 |
| `@ts-expect-error` deixa de falhar se os brands forem removidos | proteção some sem ninguém notar | o próprio `@ts-expect-error` vira erro de compilação quando não há erro para suprimir — o typecheck acusa |
| Suíte lenta faz o gate ser contornado | `AD-016` deixa de valer na prática | orçamento de 10 s na spec; nenhum teste de animação nesta fase |
