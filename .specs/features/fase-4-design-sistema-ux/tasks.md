# Fase 4 — Sistema de Design & UX — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its
Execute flow and Critical Rules.** A verificação desta fase é **majoritariamente visual**
(preview no navegador + checklist `web-design-guidelines` + UAT do autor), porque CSS/layout
não renderiza em jsdom. Só as fatias de lógica viram vitest.

**If the skill cannot be activated, STOP and tell the user.**

---

**Design**: `docs/design/design-system.md` (fonte única, `AD-031`) · **Spec**: `.specs/features/fase-4-design-sistema-ux/spec.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerada de codebase + guidelines + spec. Guidelines: `CLAUDE.md`, `docs/design/design-system.md`,
> `docs/testing/strategy.md`, `AD-016`, `AD-019`. **Regra desta fase:** camada de apresentação
> (CSS/estilo/layout) **não** é testada por vitest (jsdom não faz layout); verifica-se por
> preview + checklist de design + UAT. Só lógica de componente/config vira unit.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Apresentação (tokens, home visual, reskin do leitor, cascas, responsivo, movimento, a11y visual) | none (verificação visual) | build verde + **preview no navegador** + checklist `web-design-guidelines` + **UAT do autor**; sem scroll horizontal 320→desktop; contraste AA | `src/ui/*.css`, `src/live-book/live-book.css` (só pele), CSS de rota | build + preview |
| Lógica de componente (estados vazio/carregando/erro; slot/contagem da estante; magia nos estados) | unit | ACs de estado 1:1; renderiza o estado certo por condição | `src/routes/__tests__/*.test.tsx`, `src/ui/__tests__/*.test.tsx` | `npm test` |
| Config/limite (`MAX_BOOKS`) + gate de criação | unit | teto respeitado; criar desabilita/bloqueia no limite | `src/config/__tests__/*`, `src/routes/__tests__/*` | `npm test` |
| Não-regressão do motor (reskin só-pele) | none (gate) | **caracterização da Fase 0 verde** + suíte verde + typecheck/build | `src/live-book/__tests__/` (existente) | build |
| Não-regressão de performance | e2e | FPS ≥30 sob throttle 4× e faces ≤10 (orçamento da Fase 3) | `e2e/perf.spec.ts` (existente) | `npx playwright test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com unit (lógica de estado/limite) | `npm test` |
| Full | Igual (integração roda no mesmo vitest) | `npm test` |
| Visual | Tarefas de CSS/estilo (a maioria) | preview no navegador + checklist `web-design-guidelines` + UAT |
| Build | Fim de fase / reskin do motor | `npm run typecheck && npm run build && npm test` |
| e2e | Fase 5 (não-regressão de FPS) | `npx playwright test e2e/perf.spec.ts` |

---

## MCPs e Skills

- **MCP:** nenhum de código.
- **Skill `web-design-guidelines`:** checklist de revisão visual (T2, T14, fecho).
- **Preview do navegador (harness):** verificação visual primária de toda tarefa de CSS
  (screenshots/medições; mobile/desktop via resize).

---

## Execution Plan

### Phase 1: Fundação do sistema — DS-01/02/03/04
```
T1 → T2
```
### Phase 2: Home-estante (ShelfRoute) — DS-06/07/14, AD-033
```
T3 → T4 → T5 → T6
```
### Phase 3: Reskin só-pele do leitor — DS-06/08/09/10, AD-032
```
T7 → T8 → T9
```
### Phase 4: Cascas, estados e magia — DS-05/06/14
```
T10 → T11 → T12
```
### Phase 5: Responsivo, a11y e não-regressão — DS-11/12/13
```
T13 → T14 → T15
```

---

## Task Breakdown

### T1: Tokens do sistema em CSS
**What**: Traduzir o `design-system.md` em custom properties `--app-*` (madeira/papel/brasa/sálvia/âmbar, espaço/raio/sombra) no `:root`, e ajustar `--lb-*` espelhados quando necessário.
**Where**: `src/ui/tokens.css` (novo) importado em `main.tsx`; ajuste em `ui.css`/`app-shell.css` para consumir os tokens.
**Depends on**: None
**Requirement**: DS-01, DS-02
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Todos os tokens do `design-system.md` existem no `:root` e são consumidos (sem literal ad hoc novo)
- [ ] Estante e side menu já estilizados continuam renderizando (sem regressão) no preview
- [ ] Gate build verde
**Tests**: none (apresentação) · **Gate**: build+visual

---

### T2: Biblioteca de estilos de componente
**What**: Estilos-base reutilizáveis: tipografia (display/title/body/kicker), botão-pílula (brasa), campo, cartão, painel, banner, e o **anel de foco padrão** (sálvia/brasa) + alvo 44px.
**Where**: `src/ui/components.css` (novo), importado em `main.tsx`
**Depends on**: T1
**Requirement**: DS-03, DS-04
**Tools**: MCP NONE · Skill `web-design-guidelines` · preview
**Done when**:
- [ ] Primitivos com estados hover/focus/disabled definidos; foco visível em todos; alvo ≥44px
- [ ] Passa o checklist `web-design-guidelines` (foco, contraste, alvos)
- [ ] Gate build verde
**Tests**: none (apresentação) · **Gate**: build+visual

---

### T3: Teto de acervo (`MAX_BOOKS`) + gate de criação
**What**: `MAX_BOOKS = 50` em `limits.ts`; a home/criação desabilita "Novo volume" com mensagem ao atingir o teto.
**Where**: `src/config/limits.ts`; `src/routes/ShelfRoute.tsx` e/ou `NewBookRoute.tsx`
**Depends on**: None
**Requirement**: AD-033
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `MAX_BOOKS` exportado (comentado como limite de produto; SQL hard-enforce fica deferido)
- [ ] Com ≥50 volumes, criar é bloqueado com mensagem clara; abaixo, normal
- [ ] Unit cobre limite e abaixo-do-limite · Gate `npm test`
**Tests**: unit · **Gate**: quick

---

### T4: Estante frontal de lombadas (largura escala)
**What**: Reescrever a estante: cada volume é uma **lombada** (cor do tema, título vertical, altura variada); a prateleira **mede o acervo + folga curta** e centraliza; **slot "＋"** no fim.
**Where**: `src/ui/Shelf.tsx`, `src/ui/ShelfCard.tsx` (→ lombada), `src/ui/ui.css`
**Depends on**: T2, T3
**Requirement**: DS-06, DS-07, AD-033
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Lombada por volume (não card); largura da prateleira acompanha a contagem (3/12/30 no preview)
- [ ] Slot "＋" presente; sem prateleira meio-vazia
- [ ] Unit da lógica de contagem/slot (quantas lombadas, slot presente) · preview do visual
- [ ] Gate `npm test` + visual
**Tests**: unit (lógica) + visual · **Gate**: full+visual

---

### T5: Interação da lombada (pick + a11y)
**What**: Mirar (hover/foco) **puxa a lombada à frente** com balão de título/metadado; clicar/Enter abre o volume; navegável por teclado.
**Where**: `src/ui/Shelf.tsx`/`ShelfCard.tsx`, `ui.css`
**Depends on**: T4
**Requirement**: DS-06, DS-04
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Hover/foco desloca (não escala) + revela título; link para `/b/:id` correto
- [ ] Teclado: Tab alcança cada lombada, foco visível; Enter navega
- [ ] Unit do link/aria + preview da interação
**Tests**: unit (link/aria) + visual · **Gate**: full+visual

---

### T6: Estados da home (vazia/carregando)
**What**: Home vazia com **motivo da magia** + "Seu primeiro livro aparece aqui" + CTA; carregando com pulsação (some no reduced-motion).
**Where**: `src/routes/ShelfRoute.tsx`, `src/ui/ui.css`
**Depends on**: T4, T12 (motivo magia — se T12 vier depois, usar placeholder e ligar em T12)
**Requirement**: DS-05, DS-07, DS-14
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Estado vazio e carregando renderizam por condição (0 volumes / carregando)
- [ ] Unit dos condicionais de estado · preview do visual
- [ ] Gate `npm test` + visual
**Tests**: unit (condicionais) + visual · **Gate**: full+visual

---

### T7: Reskin do palco — a mesa amadeirada (só-pele, AD-032)
**What**: Fundo do palco = **amadeirado texturado** (cor sólida + grão fino, sem tábuas), poço de **abajur**, **vinheta** e **sombra de contato**, via `--lb-*` e CSS **não-geométrico**.
**Where**: borda do `LiveBook` (`--lb-*` no `ReaderRoute`/tema) e `src/live-book/live-book.css` (**só propriedades de cor/textura/fundo — arquivo WARNED, AD-032**)
**Depends on**: T1
**Requirement**: DS-06, DS-10, AD-032
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Palco lê como mesa de madeira quente com luz de abajur; papel continua a coisa mais clara
- [ ] **Nenhuma** mudança em geometria/`faces`/`angles`/`surfaceCache`/`constants.ts`; **caracterização da Fase 0 verde**
- [ ] Gate build (typecheck+build+test) + visual
**Tests**: none (gate: Fase 0 verde) · **Gate**: build+visual

---

### T8: Reskin da folha — papel fosco, capítulo, fita (só-pele)
**What**: Papel fosco, borda/sombra de folha, tipografia de **capítulo/capitular/número** e **fita sálvia**, via tokens de tema (`--lb-*`).
**Where**: tema de surface (`--lb-*`) e `live-book.css` (só cor/tipografia não-geométrica, AD-032); possivelmente `prose.css`
**Depends on**: T7
**Requirement**: DS-06, DS-10, AD-032
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Folha fosca (sem verniz), capítulo/capitular em serifa, fita sálvia; discreto e legível
- [ ] Caracterização da Fase 0 verde; sem toque em geometria
- [ ] Gate build + visual
**Tests**: none (gate: Fase 0 verde) · **Gate**: build+visual

---

### T9: Surface `album` — qualidade visual (tema, layouts, molduras)
**What**: Tema `album` alinhado à paleta quente (papel neutro, legenda); layouts e molduras (`plain`/`polaroid`/`bleed`/`circle`) polidos para ler como livro de fotos.
**Where**: `src/book/surfaces/album/` (`album.css`, blocos)
**Depends on**: T1, T8
**Requirement**: DS-08, DS-09
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Album com fotos reais lê como livro de fotos editorial; 6 layouts + 4 molduras distintos e acabados
- [ ] Aspecto extremo contido (já da Fase 3) — validar visual
- [ ] Testes existentes do album verdes · preview
**Tests**: none novo (existentes verdes) · **Gate**: build+visual

---

### T10: Casca do leitor no sistema
**What**: Cabeçalho/controles do leitor e `.app-reader` alinhados ao sistema (evoluir `app-shell.css`); coeso com a home.
**Where**: `src/ui/app-shell.css`, `src/routes/ReaderRoute.tsx` (só cromo)
**Depends on**: T2, T7
**Requirement**: DS-06
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Cromo do leitor coeso; motor intocado (`AD-022`)
- [ ] Testes de rota existentes verdes · preview
**Tests**: none (apresentação) · **Gate**: build+visual

---

### T11: Criar / importar / compartilhar / erro no sistema
**What**: Levar `NewBookRoute`, `ImportRoute`, `ShareRoute` e estados not-found/erro para o sistema (evoluir `app-shell.css`), com estados desenhados.
**Where**: `src/ui/app-shell.css`, ajustes de cromo nas rotas
**Depends on**: T2
**Requirement**: DS-05, DS-06
**Tools**: MCP NONE · Skill `web-design-guidelines` · preview
**Done when**:
- [ ] As 4 telas/estados no sistema (fundo, tipografia, botões, drop, resgate, erro)
- [ ] Testes de rota existentes verdes; passa checklist de design · preview
**Tests**: none (apresentação; rotas existentes verdes) · **Gate**: full+visual

---

### T12: Motivo da magia — livro-farol
**What**: Componente do **livro-farol** (levita + faíscas âmbar + brilho), para **home-vazia / carregando / volume-vazio**; respeita `reduced-motion` (para, não some). Nunca na leitura.
**Where**: `src/ui/Magic.tsx` (novo) + `magic.css`; ligado em ShelfRoute (vazio/carregando) e ReaderRoute (volume vazio, substitui/eleva a afordância atual)
**Depends on**: T2
**Requirement**: DS-05, DS-10, DS-14
**Tools**: MCP NONE · Skill NONE · preview
**Done when**:
- [ ] Livro-farol aparece nos 3 estados; **não** aparece durante leitura de volume com páginas
- [ ] `reduced-motion`: sem animação, composição parada visível
- [ ] Unit da presença nos estados certos · preview do visual/movimento
**Tests**: unit (presença por estado) + visual · **Gate**: full+visual

---

### T13: Responsivo 320→desktop
**What**: Garantir todas as telas de 320px a desktop sem scroll horizontal nem controle cortado; amarra com o modo retrato (`AD-029`).
**Where**: CSS de `src/ui/` e rotas
**Depends on**: T4, T6, T10, T11, T12
**Requirement**: DS-11
**Tools**: MCP NONE · Skill NONE · preview (resize mobile/tablet/desktop)
**Done when**:
- [ ] 320/768/desktop sem scroll horizontal; retrato do leitor intacto
- [ ] Preview nos 3 tamanhos · visual
**Tests**: none (apresentação) · **Gate**: build+visual

---

### T14: Passe de acessibilidade
**What**: Contraste AA (verificar acentos sobre papel — ajustar tom se faltar), foco visível em todo controle, alvos 44px, ordem de foco.
**Where**: CSS de `src/ui/`, rotas; ajuste de tokens se contraste faltar
**Depends on**: T13
**Requirement**: DS-04, DS-12
**Tools**: MCP NONE · Skill `web-design-guidelines` · preview
**Done when**:
- [ ] Contraste AA medido para texto de conteúdo e acentos; foco/alvos ok em todas as rotas
- [ ] Passa checklist `web-design-guidelines` (a11y) · preview
**Tests**: none (auditoria visual) · **Gate**: build+visual

---

### T15: Não-regressão (Fase 0 + FPS) e fecho
**What**: Confirmar que o reskin não regrediu nada: caracterização da Fase 0 + suíte verde; FPS/faces da Fase 3 no orçamento; typecheck/build.
**Where**: execução de gates (sem código novo, salvo correções pontuais)
**Depends on**: T7, T8, T9
**Requirement**: DS-13
**Tools**: MCP NONE · Skill NONE
**Done when**:
- [ ] `npm run typecheck && npm run build && npm test` verde (Fase 0 incluída)
- [ ] `npx playwright test e2e/perf.spec.ts`: FPS ≥30, faces ≤10 (se ambiente com Chromium)
- [ ] Nenhuma mudança de geometria do motor no diff da fase
**Tests**: none (gate) + e2e · **Gate**: build + e2e

**Commit**: `test(fase-4): confirmar nao-regressao do motor e FPS apos reskin`

---

## Phase Execution Map
```
Phase 1: T1 → T2
Phase 2: T3 → T4 → T5 → T6
Phase 3: T7 → T8 → T9
Phase 4: T10 → T11 → T12
Phase 5: T13 → T14 → T15
```
15 tarefas → ~3 batches de ~5–6 (offer-then-confirm no Execute). Nota: T6 depende do motivo de magia de T12 — se executado antes, usar placeholder e ligar em T12 (ou reordenar T12 antes de T6 no batch da home).

---

## Task Granularity Check
| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 tokens | 1 arquivo de tokens | ✅ |
| T2 componentes | 1 folha de primitivos coesa | ⚠️ coeso (mesma folha) |
| T3 cap+gate | 1 const + 1 guarda | ✅ |
| T4 estante lombadas | estante (1 conceito) | ✅ |
| T5 interação lombada | 1 interação | ✅ |
| T6 estados home | estados da home | ✅ |
| T7 reskin palco | 1 aspecto (mesa) | ✅ |
| T8 reskin folha | 1 aspecto (folha) | ✅ |
| T9 album visual | 1 surface | ✅ |
| T10 casca leitor | 1 cromo | ✅ |
| T11 cascas rotas | 4 telas coesas (mesma folha) | ⚠️ coeso |
| T12 magia | 1 componente | ✅ |
| T13 responsivo | 1 passe | ✅ |
| T14 a11y | 1 passe | ✅ |
| T15 não-regressão | 1 gate | ✅ |

⚠️ = grupos coesos na mesma folha/conceito (dentro da regra "2–3 coisas relacionadas OK").

## Diagram-Definition Cross-Check
| Task | Depends On (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | início | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | None | início fase 2 | ✅ |
| T4 | T2, T3 | T2/T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T4, T12 | T4→T6 (T12 nota) | ✅ (dep cross-fase T12 anotada) |
| T7 | T1 | início fase 3 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | T1, T8 | T8→T9 | ✅ |
| T10 | T2, T7 | início fase 4 | ✅ |
| T11 | T2 | T10→T11 | ✅ |
| T12 | T2 | T11→T12 | ✅ |
| T13 | T4,T6,T10,T11,T12 | →T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T7,T8,T9 | →T15 | ✅ |

Nota: T6→T12 é dependência de conteúdo (motivo de magia) que cruza fase; mitigada por placeholder + ligação em T12, ou reordenar T12 antes de T6. Sem dependência apontando para fase posterior no caminho crítico de execução.

## Test Co-location Validation
| Task | Layer | Matriz exige | Task diz | Status |
| ---- | ----- | ------------ | -------- | ------ |
| T1 | Apresentação | none | none | ✅ |
| T2 | Apresentação | none | none | ✅ |
| T3 | Config/lógica | unit | unit | ✅ |
| T4 | Lógica + apresentação | unit | unit+visual | ✅ |
| T5 | Lógica + apresentação | unit | unit+visual | ✅ |
| T6 | Lógica + apresentação | unit | unit+visual | ✅ |
| T7 | Apresentação + não-regressão motor | none (gate Fase 0) | none | ✅ |
| T8 | Apresentação + não-regressão motor | none (gate Fase 0) | none | ✅ |
| T9 | Apresentação | none | none | ✅ |
| T10 | Apresentação | none | none | ✅ |
| T11 | Apresentação | none | none | ✅ |
| T12 | Lógica + apresentação | unit | unit+visual | ✅ |
| T13 | Apresentação | none | none | ✅ |
| T14 | Apresentação | none | none | ✅ |
| T15 | Não-regressão | none+e2e | none+e2e | ✅ |

`Tests: none` aqui **não é deferimento**: a matriz define a camada de apresentação como verificada por preview+checklist+UAT (CSS não roda em jsdom). Toda fatia de lógica (T3/T4/T5/T6/T12) carrega unit.

---

## Requirement Traceability
| ID | Tasks |
|---|---|
| DS-01/02 | T1 |
| DS-03/04 | T2, T14 |
| DS-05 | T6, T11, T12 |
| DS-06 | T4–T11 |
| DS-07 | T4, T6 |
| DS-08/09 | T9 |
| DS-10 | T7, T8, T12 |
| DS-11 | T13 |
| DS-12 | T14 |
| DS-13 | T15 |
| DS-14 | T6, T12 |
