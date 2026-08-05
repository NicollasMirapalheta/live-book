# Roadmap

Fases de entrega, cada uma terminando em algo funcional. Revisado após a modelagem de
domínio e a correção dos quatro furos da revisão do plano original.

**Mudanças em relação ao plano anterior:**
- `kind` deixou de existir; o eixo é `surface` ([ADR-001](adr/001-superficie-como-unico-eixo-de-variacao.md))
- entra a **Fase 0**, porque testes valem desde o começo (`AD-016`)
- recuperação do token de edição (`AD-017`) e histórico de revisões (`AD-018`) entram na Fase 2A
- acessibilidade vira critério de aceite (`AD-019`), não backlog
- a **Fase 2 foi dividida** em 2A (persistência) e 2B (rotas e biblioteca): treze requisitos
  com dois vocabulários distintos e pouca dependência entre eles
- a surface **`album` saiu da Fase 1 para a Fase 3** (`AD-023`): projetá-la antes do pipeline
  de mídia seria desenhar tema e molduras sem nunca ver uma foto dentro deles

Cada fase tem spec formal em `.specs/features/`. As Fases 0 e 1 têm também `tasks.md`
executável; as demais recebem design e tasks quando chegarem.

---

## Fase 0 — Fundação de correção

📄 [spec](../.specs/features/fase-0-fundacao/spec.md) · [tasks](../.specs/features/fase-0-fundacao/tasks.md) — 7 tasks, pronta para executar

**Objetivo:** ter rede de segurança antes de tocar em qualquer coisa. Nada muda na tela.

| Entrega | Onde |
|---|---|
| Vitest configurado | `vitest.config.ts`, `package.json` |
| Unidades de paginação + conversões | `src/book/units.ts` |
| Testes tabelados das conversões | `src/book/__tests__/units.test.ts` |
| Testes de caracterização do motor | `src/live-book/__tests__/engine.contract.test.tsx` |

Os testes de caracterização descrevem o comportamento **atual** do motor pela API pública
— montagem de faces, `leaves`, sumário, numeração, janela de virtualização. São o que
permite mexer no `stageOffset` na Fase 3 sem medo.

**Pronto quando:** `npm run typecheck` e a suíte verdes, e os testes do motor passam
**sem que nenhuma linha de `src/live-book/` tenha sido alterada**.

---

## Fase 1 — Documento e renderer

📄 [spec](../.specs/features/fase-1-documento-renderer/spec.md) · [design](../.specs/features/fase-1-documento-renderer/design.md) · [tasks](../.specs/features/fase-1-documento-renderer/tasks.md) — 14 tasks, 2 batches

**Objetivo:** o demo atual passa a ser gerado de um `BookDoc`. Nada muda na tela.

| Entrega | Onde |
|---|---|
| Schema e migração | `src/book/{schema,migrate,factory}.ts` |
| Renderer puro | `src/book/{renderPages,PageBody,RenderCtx}.tsx` |
| Blocos de núcleo (8) | `src/book/blocks/` + `blocks.css` |
| Registry de surfaces | `src/book/surfaces/registry.ts` |
| Surface `manuscript` | `src/book/surfaces/manuscript/` |
| Demo como documento | `src/demo/demoDoc.ts`, `src/App.tsx` |

Mudanças no motor: props `style` e `apiRef`, e a guarda de `contentEditable` no teclado.

**Por que o demo vira documento antes de existir editor:** se o schema não expressar algum
layout, o custo de mudá-lo agora é zero.

**Pronto quando:** o livro renderizado do `demoDoc` é indistinguível do `App.tsx` atual —
mesmos capítulos no sumário, mesma numeração, mesmas fitas —, e `renderPages` comprovadamente
**não** monta a árvore de blocos.

---

## Fase 2A — Persistência e acesso

📄 [spec](../.specs/features/fase-2a-persistencia/spec.md)

**Objetivo:** criar, salvar, carregar, apagar e compartilhar volumes, sem perder acesso
nem conteúdo por acidente.

| Entrega | Onde |
|---|---|
| Interface e 3 adapters | `src/data/{StorageAdapter.ts,supabase,local,public}` |
| Suíte de contrato rodando nos 3 | `src/data/__tests__/adapter.contract.ts` |
| DDL, RLS, RPCs, revisões | `src/data/supabase/schema.sql` |
| Recuperação do token (`AD-017`) | `src/data/editTokens.ts` |
| Sanitização de HTML (dívida do `AD-024`) | `src/book/sanitize.ts` |

**Pronto quando:** a mesma suíte de contrato passa nos três adapters; `check-rls.mjs`
recusa as seis operações proibidas; restaurar uma revisão devolve o conteúdo exato; e
remover `VITE_SUPABASE_URL` faz o app subir no `LocalAdapter`.

---

## Fase 2B — Rotas e biblioteca

📄 [spec](../.specs/features/fase-2b-rotas-biblioteca/spec.md)

**Objetivo:** chegar até os volumes, e conseguir lê-los só com o teclado.

| Entrega | Onde |
|---|---|
| Rotas e URL canônica por página | `src/routes/` |
| Estante | `src/ui/{Shelf,ShelfCard}.tsx` |
| Side menu de troca rápida | `src/ui/SideMenu.tsx` |
| Correção de a11y do leitor (`AD-019`) | `src/live-book/LiveBook.tsx` |

Mudanças no motor: `toolbar`, `wheelFlip`, e a correção dos botões focáveis dentro de
subárvore `aria-hidden`.

**Pronto quando:** voltar do navegador funciona depois de folhear 40 páginas; a estante
com 30 volumes não carrega nenhum documento completo; `/s/:token` em janela anônima não
tem controle de edição no DOM; e o leitor inteiro é navegável só com Tab.

---

## Fase 3 — Imagens, surface `album` e modo retrato

📄 [spec](../.specs/features/fase-3-imagens-retrato/spec.md)

**Objetivo:** foto entra no volume, e o volume é legível no celular **com a virada 3D**.

| Entrega | Onde |
|---|---|
| Pipeline de imagem em worker | `src/media/{imageProcess,image.worker}.ts` |
| Prefetch e cache de asset | `src/media/{useAssetPrefetch,assetCache}.ts` |
| Surface `album` (`AD-023`) | `src/book/surfaces/album/` |
| Modo retrato (`AD-005`) | `src/live-book/useStageScale.ts`, `stageOffset` |
| Playwright como gate de performance | `e2e/`, conserto do `shot.mjs` |

Esta é a fase de maior risco: é o único lugar onde a geometria do motor é alterada. Os
testes de caracterização da Fase 0 existem exatamente para isso.

**Pronto quando:** folhear 20 páginas com foto sob throttle 4× mantém ≥ 30 FPS; faces
montadas ≤ 10; e em 390×844 a página é legível **e a virada funciona**.

---

## Fase 4 — Sistema de Design & UX — **fase dedicada** (`AD-030`)

📄 [spec](../.specs/features/fase-4-design-sistema-ux/spec.md)

**Objetivo:** o produto deixa de "só funcionar" e passa a ter UI e UX de qualidade, sob um
sistema de design documentado e aplicado em todas as telas. Vem **antes** do editor de
propósito: a Fase 5 é construída sobre este sistema, não acumulando dívida para repolir
depois. Corrige a lacuna que ficou explícita ao abrir o app na web (leitor espremido,
telas cruas — remediada em parte por `casca-visual-rotas`, agora formalizada num sistema).

| Entrega | Onde |
|---|---|
| Linguagem visual documentada (identidade, tipografia, cor, espaçamento, elevação, movimento) | `docs/design/design-system.md`, tokens `--lb-*`/`--app-*` |
| Biblioteca de componentes/estilos de produto (botões, campos, cartões, painéis, banners, navegação) | `src/ui/` |
| Estados desenhados em todo fluxo (vazio, carregando, erro, sucesso, conflito) | rotas + `src/ui/` |
| Aplicação coerente em estante, leitor, side menu, criar/importar/compartilhar, not-found | `src/ui/`, `src/routes/` |
| Qualidade visual da surface `album` (tema, layouts, molduras como um livro de fotos de verdade) | `src/book/surfaces/album/` |
| Movimento e micro-interações (hover, foco, transições) respeitando `AD-005`/reduced-motion e a performance | `src/ui/`, CSS |
| Responsivo mobile→desktop (amarra com o modo retrato, `AD-029`) e polimento de a11y (`AD-019`) | CSS, componentes |

**Restrições:** estende o `AD-015` (não o substitui); não toca o motor (`AD-022`) — só props
aditivas e CSS vars na borda; a virada sempre anima; sem modo escuro (fora de escopo);
performance é requisito (nada de efeito que derrube FPS na máquina fraca).

**Pronto quando:** existe um design-system.md que é fonte única; toda tela existente reflete
o sistema e passa num checklist de design (web-design-guidelines) + UAT do autor; todo fluxo
tem estados vazio/carregando/erro desenhados; contraste, foco e alvos de 44px verificados; e
o orçamento de FPS da Fase 3 continua verde.

---

## Fase 5 — Editor visual — marco do presente

📄 [spec](../.specs/features/fase-5-editor/spec.md)

**Objetivo:** montar o álbum pela interface, sem tocar em código — sobre o sistema de design
da Fase 4.

| Entrega | Onde |
|---|---|
| Store com undo/redo por patches | `src/editor/{BookStore,useBookStore}.ts` |
| Autosave com `rev` e conflito | `src/editor/autosave.ts` |
| Casca do editor e trilho | `src/editor/{EditorShell,PageRail,Inspector}.tsx` |
| Texto rico e drop de fotos | `src/editor/{RichText,DropZone}.tsx` |
| Layouts e inspectors do `album` | `src/book/surfaces/album/` |
| **Criação elaborada** (`/new`): escolher tipo de conteúdo (vazio / note / manuscrito / álbum) com estrutura inicial por tipo | `src/routes/NewBookRoute.tsx` |

Nenhuma mudança em `src/live-book/`. Já feito na Fase 4: volume novo nasce com 5 páginas
em branco (para não abrir vazio até o editor existir).

**Pronto quando:** dá para montar um álbum de 10 páginas com fotos de ponta a ponta; as
setas não viram a página com foco em texto; o caret não pula durante o autosave; e
undo/redo restaura exatamente.

---

## Fase 6 — Surface `journal`

Diário: cabeçalho de entrada, pauta suave, escrita direta na página aberta. Reusa o
`EditorShell` com o trilho colapsado.

Atenção ao risco conhecido: adicionar página muda a paridade de folhas e recria os
`MotionValue` de ângulo, descartando animação em voo. Inserção só no fim, e bloqueada
durante virada.

---

## Fase 7 — Surface `scan` e ingestor `pdf`

Rasteriza cada página do PDF ([ADR-005](adr/005-orcamento-de-imagem-e-janela-de-virtualizacao.md),
`AD-021`); `getOutline()` alimenta `chapter`, então o sumário do motor funciona de graça.
Capa substituível pelo mesmo editor de capa, porque capa é `CoverSpec` de blocos.

É aqui que o documento pode passar de 1 MB e acionar o escape hatch do
[ADR-003](adr/003-documento-como-jsonb-com-historico.md).

---

## Fase 8 — Auth, multiusuário e billing — **não construir**

Registrada para deixar o dia D explícito: ligar Supabase Auth, chamar `claim_book` no
primeiro login, trocar duas policies de storage, adicionar `profiles.plan`.

Nenhuma delas toca `live-book/`, `renderPages`, `schema.ts` ou o registry de surfaces.

---

## Fora de escopo

| Item | Motivo |
|---|---|
| Modo escuro | metáfora do produto é papel iluminado; exigiria segunda identidade |
| Colaboração em tempo real | `rev` + aviso de conflito bastam |
| Refluxo de texto de PDF | destrói o motivo de importar um PDF |
| Drag & drop de blocos dentro da página | layouts nomeados cobrem 95% por 10% do esforço |
| Curvatura real de papel | exigiria WebGL e custaria o conteúdo interativo |
| Tailwind, Zustand, dnd-kit, blurhash | o projeto tem 3 dependências de runtime e isso é uma qualidade |
