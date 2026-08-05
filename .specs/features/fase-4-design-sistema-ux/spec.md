# Fase 4 — Sistema de Design & UX — Specification

**Escopo**: Complex
**Status**: Draft
**Pré-requisito**: Fase 3 concluída
**Decisão de origem**: `AD-030` (fase dedicada, antes do editor, escopo sistema + aplicação)

## Problem Statement

O produto funciona ponta a ponta — documento, persistência, rotas, imagens, retrato — mas a
qualidade de UI/UX ficou para trás. O design foi distribuído por fase e acumulou dívida que
só apareceu ao abrir o app na web: o leitor abria espremido, as telas de criar/importar eram
HTML cru. A `casca-visual-rotas` remediou o pior de forma reativa, mas não existe uma
linguagem visual coesa nem um sistema de componentes — o `AD-015` definiu tokens e uma
intenção editorial, não um sistema aplicado e verificável.

O primeiro entregável real é um **álbum de fotos dado de presente**. "Só funcionar" não
serve: o artefato precisa parecer especial, ter fluxos claros e sensação de acabamento. Esta
fase eleva o `AD-015` a um sistema completo e o aplica em tudo que existe, **antes** do editor
(Fase 5), para o editor nascer coerente em vez de virar mais dívida a repolir.

## Goals

- [ ] Existe um sistema de design **documentado e é fonte única** — identidade, tipografia,
      cor, espaçamento, elevação, raio, movimento, componentes e estados
- [ ] **Toda tela existente** reflete o sistema e passa num checklist de design + UAT do autor
- [ ] **Todo fluxo tem seus estados desenhados**: vazio, carregando, erro, sucesso, conflito
- [ ] A surface `album` parece um **livro de fotos de verdade**, não uma grade utilitária
- [ ] Responsivo de 320 px a desktop, acessível (contraste AA, foco, alvos 44px), **sem
      regressão de performance** (orçamento de FPS da Fase 3 preservado)

## Out of Scope

| Item | Motivo |
|---|---|
| UI do editor | É a Fase 5; **consome** este sistema, não é construída aqui |
| Modo escuro | Fora de escopo do roadmap (metáfora é papel iluminado) |
| Alterar o motor de virada | `AD-022`; polimento só por props aditivas e CSS vars na borda |
| Novas dependências de runtime (Tailwind, biblioteca de componentes, etc.) | `AD-015`: 3 deps de runtime é qualidade; sistema é CSS plano + componentes próprios |
| Rebrand / novo nome / logo profissional | Identidade visual sim; branding de marca formal não |
| Redesenho de fluxos de backend/dados | Só a camada de apresentação e experiência |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Direção visual concreta (referências, paleta final, "cara" do produto) | definida na **fase de Design** desta feature, via discovery com o autor (skill `frontend-blueprint`: referências, moodboard, tokens, tipografia) | "bonito" depende do gosto/referências do autor; não é decidível no papel pela spec | **n — resolver no Design** |
| Verificação das ACs visuais | preview no navegador + checklist `web-design-guidelines` + **UAT do autor** | qualidade estética é parcialmente subjetiva e CSS/layout não renderiza em jsdom | s |
| Base do sistema | **estende** o `AD-015` (tokens `--lb-*`/`--app-*`, Fraunces + Inter, CSS plano) | não jogar fora o que já existe; consolidar, não substituir | s |
| Escala tipográfica, grid de espaçamento, elevação | definir uma escala explícita (ex.: type scale modular, espaçamento base 4/8, níveis de sombra) | sistema precisa de regras, não valores ad hoc | s (valores no Design) |
| Movimento | linguagem de micro-interações (hover/foco/transições) com duração/easing padronizados; a virada 3D é intocada (`AD-005`) e `prefers-reduced-motion` corta só o acessório | `AD-005`/memória do projeto: a virada é o produto | s |
| Componentes | biblioteca própria de estilos/primitivos em `src/ui/` (botão, campo, cartão, painel, banner, nav, estados), sem lib externa | `AD-015` (sem novas deps); reuso e coerência | s |
| Ícones | conjunto leve inline (SVG) padronizado, sem dependência | evita 3ª dep; controle de peso | s (set no Design) |

**Open questions:** a direção visual concreta é a única aberta e é **deliberadamente**
resolvida na fase de Design (discovery com o autor), não aqui. Tudo o mais está travado.

---

## Dimensões de UX (o equivalente às "dimensões implícitas")

| Dimensão | Cobertura |
|---|---|
| Estados de dados | vazio, carregando, erro, sucesso, conflito de `rev` — desenhados em cada fluxo |
| Primeiro uso | estante vazia e volume vazio com afordância clara (não parecer bug) |
| Feedback | toda ação (criar, importar, salvar, folhear) tem retorno visual imediato |
| Navegação | hierarquia e "onde estou / como volto" claros entre estante, leitor, editor futuro |
| Responsivido | 320 px → desktop; amarra com retrato (`AD-029`); alvos de toque 44px |
| Acessibilidade | contraste AA, foco visível em todo controle, ordem de foco, respeita reduced-motion (`AD-019`) |
| Performance | nenhum efeito visual derruba o orçamento de FPS da Fase 3 (máquina fraca, 300+ páginas) |
| Consistência | um único sistema — nada de tela divergente; o editor (Fase 5) herda tudo |

---

## User Stories

### P1: Sistema de design documentado ⭐ MVP

**User Story**: Como quem constrói o produto, quero uma fonte única da linguagem visual,
para toda tela (inclusive o editor futuro) ser coerente sem reinventar.

**Why P1**: Sem o sistema, "aplicar design" vira gosto de cada tela — a dívida que já bateu.

**Acceptance Criteria**:

1. QUANDO o sistema é definido ENTÃO `docs/design/design-system.md` DEVE documentar identidade, escala tipográfica, paleta, espaçamento, raio, elevação, movimento (durações/easing) e os estados-padrão, com os tokens correspondentes
2. QUANDO um valor visual é usado em código ENTÃO ele DEVE vir de um token do sistema, não de um literal ad hoc solto
3. QUANDO o sistema é definido ENTÃO ele DEVE estender o `AD-015` (mesmas fontes e famílias de token), sem novas dependências de runtime

**Independent Test**: revisão do `design-system.md` + varredura de que as telas consomem tokens; checklist `web-design-guidelines`.

---

### P1: Biblioteca de componentes de produto ⭐ MVP

**User Story**: Como quem constrói telas, quero primitivos consistentes (botão, campo,
cartão, painel, banner, navegação, estados), para não restilizar do zero a cada rota.

**Acceptance Criteria**:

1. QUANDO um controle interativo é renderizado ENTÃO ele DEVE usar os estilos/primitivos do sistema (variantes de botão, campo, etc.), com estados hover/focus/disabled definidos
2. QUANDO qualquer controle recebe foco por teclado ENTÃO DEVE ter anel de foco visível com contraste (`AD-019`) e alvo ≥ 44px
3. QUANDO um estado vazio/carregando/erro é exibido ENTÃO DEVE usar um componente/estilo padronizado, não markup solto por tela

**Independent Test**: navegar cada rota por teclado e conferir foco/alvos; inspecionar que os controles compartilham as classes/estilos do sistema.

---

### P1: Aplicação coerente nas telas existentes ⭐ MVP

**User Story**: Como usuária, quero que estante, leitor, side menu, criar, importar,
compartilhar e erros pareçam o mesmo produto, bem-acabado.

**Acceptance Criteria**:

1. QUANDO qualquer rota existente é aberta (`/`, `/new`, `/b/:id`, `/b/:id/import`, `/s/:token`, not-found) ENTÃO ela DEVE refletir o sistema e passar no checklist de design
2. QUANDO a estante tem 0, 1 e muitos volumes ENTÃO cada caso DEVE ter tratamento visual intencional
3. QUANDO o leitor abre ENTÃO a casca (cabeçalho, controles, fundo) DEVE ser coesa com o resto, e o motor DEVE continuar intocado (`AD-022`)

**Independent Test**: percorrer todas as rotas no preview em desktop e mobile; comparar antes/depois; UAT do autor.

---

### P1: Qualidade visual da surface `album` ⭐ MVP

**User Story**: Como quem recebe o presente, quero que o álbum pareça um livro de fotos de
verdade, porque é isso que torna o presente especial.

**Why P1**: É o entregável âncora do produto (`AD-004`); a estética aqui é o valor.

**Acceptance Criteria**:

1. QUANDO um álbum é aberto ENTÃO tema, margens, tipografia de legenda e molduras DEVEM ler como um livro de fotos editorial, não uma grade utilitária
2. QUANDO os layouts (`full-bleed`, `single`, `duo`, `grid`, `photo-text`, `text`) e as molduras (`plain`, `polaroid`, `bleed`, `circle`) são vistos com fotos reais ENTÃO cada um DEVE ter acabamento e distinção visual claros
3. QUANDO o álbum é folheado ENTÃO o polimento NÃO DEVE custar o orçamento de FPS da Fase 3

**Independent Test**: montar um álbum de demonstração com fotos reais e revisar cada layout/moldura; medir FPS como na Fase 3.

---

### P1: Movimento, responsivo e acessibilidade ⭐ MVP

**User Story**: Como usuária em qualquer dispositivo, quero transições agradáveis, layout
que funciona no celular e acesso por teclado/leitor de tela.

**Acceptance Criteria**:

1. QUANDO há hover/foco/transição de estado ENTÃO o movimento DEVE seguir as durações/easing do sistema, e a virada 3D permanece como está (`AD-005`)
2. QUANDO `prefers-reduced-motion` está ativo ENTÃO o acessório (hover, painéis) DEVE reduzir, mas a **virada continua animando** (memória do projeto)
3. QUANDO a viewport varia de 320 px a desktop ENTÃO nenhuma tela DEVE ter scroll horizontal nem controle cortado; o modo retrato (`AD-029`) segue funcionando
4. QUANDO o contraste de texto/controle é medido ENTÃO DEVE atender WCAG AA

**Independent Test**: `resize_window` mobile/tablet/desktop; verificar reduced-motion; medir contraste; medir FPS.

---

### P2: Deleite de primeiro uso

**User Story**: Como autora nova, quero que estante vazia e volume recém-criado me guiem com
clareza (e um toque de charme), em vez de parecerem quebrados.

**Acceptance Criteria**:

1. QUANDO a estante está vazia ENTÃO DEVE haver um estado inicial acolhedor com chamada clara para criar
2. QUANDO um volume vazio é aberto ENTÃO a afordância (já existente) DEVE estar integrada ao sistema visual, não como remendo

**Independent Test**: abrir com biblioteca vazia; criar e abrir um volume vazio.

---

## Edge Cases

- QUANDO um volume tem título/legenda muito longos ENTÃO o layout DEVE acomodar sem quebrar (truncar/quebrar com elegância)
- QUANDO uma foto tem proporção extrema ENTÃO a moldura DEVE conter sem distorcer (já garantido na Fase 3; validar visualmente)
- QUANDO a rede/back-end está indisponível ENTÃO o estado de carregando/erro DEVE ser claro, nunca tela branca
- QUANDO a máquina é fraca ENTÃO o polimento DEVE degradar o acessório antes de tocar a virada ou o FPS

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| DS-01 | P1 — sistema documentado + tokens | — | Pending |
| DS-02 | P1 — tudo consome token (sem literal ad hoc) | — | Pending |
| DS-03 | P1 — biblioteca de componentes/estilos | — | Pending |
| DS-04 | P1 — foco visível + alvos 44px em todo controle | — | Pending |
| DS-05 | P1 — estados vazio/carregando/erro/sucesso/conflito padronizados | — | Pending |
| DS-06 | P1 — aplicação coerente em todas as rotas | — | Pending |
| DS-07 | P1 — estante em 0/1/muitos | — | Pending |
| DS-08 | P1 — qualidade visual da surface `album` | — | Pending |
| DS-09 | P1 — layouts/molduras distintos e acabados | — | Pending |
| DS-10 | P1 — movimento padronizado + reduced-motion (virada intocada) | — | Pending |
| DS-11 | P1 — responsivo 320→desktop sem scroll horizontal | — | Pending |
| DS-12 | P1 — contraste AA | — | Pending |
| DS-13 | P1 — sem regressão de FPS (orçamento Fase 3) | — | Pending |
| DS-14 | P2 — deleite de primeiro uso | — | Pending |

---

## Success Criteria

- [ ] `docs/design/design-system.md` é fonte única e as telas consomem seus tokens
- [ ] Percorrer estante → criar → importar → leitor → compartilhar em mobile e desktop parece **um** produto acabado (UAT do autor: aprovado)
- [ ] Todo fluxo tem estado vazio/carregando/erro desenhado; nenhuma tela crua
- [ ] O álbum, com fotos reais, parece um livro de fotos (UAT do autor: aprovado)
- [ ] Contraste AA, foco visível e alvos 44px em todos os controles
- [ ] Sem scroll horizontal de 320 px a desktop; retrato (`AD-029`) intacto
- [ ] FPS da Fase 3 (≥30 sob throttle 4×, ≤10 faces) permanece verde
- [ ] Nenhuma mudança no motor (`AD-022`); nenhuma nova dependência de runtime (`AD-015`)
