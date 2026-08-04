# ADR-001: Superfície como único eixo de variação armazenado

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: architecture, domain, extensibility

## Context and Problem Statement

O Live Book precisa suportar volumes muito diferentes — álbum de fotos, diário,
PDF importado, e no futuro ficha de RPG e coleção de cartas — sem bifurcar o motor de
virada. A pergunta é qual é a dimensão de variação: o desenho inicial assumia um `kind`
único por volume (`photo | journal | pdf`), com cada tipo trazendo blocos, editor,
ingestor e tema num pacote fechado.

A modelagem de domínio revelou que `kind` funde duas coisas independentes: **de onde as
páginas vieram** e **como o volume se apresenta**. São ortogonais — um PDF pode ser
apresentado como álbum, e um diário quase sempre vai receber fotos depois.

## Decision Drivers

- Adicionar um tipo novo não pode exigir refatoração do motor nem do schema
- Combinações previsíveis ("diário com fotos") não podem exigir código novo
- A UX de criação precisa continuar simples: o usuário escolhe "um diário", não dois eixos
- O motor de virada é intocável (ver [ADR-002](002-traducao-de-documento-por-funcao-pura.md))

## Considered Options

- **A** — Registry de `kind`: um eixo, pacote fechado por tipo
- **B** — Dois eixos armazenados: `source` × `surface`
- **C** — Capabilities: sem tipo, o volume declara o que sabe fazer
- **D** — Superfície armazenada + ingestores em catálogo + origem como histórico

## Decision Outcome

Escolhida a **opção D**. O volume armazena apenas `surface` (apresentação). Ingestores
formam um catálogo separado de ações que produzem `BookPage[]`, e a origem das páginas
fica registrada como `provenance` — rastreabilidade, não restrição. Presets escondem os
dois conceitos na criação: "Criar um álbum" fixa `album` + ingestor `photos`.

### Positive Consequences

- "PDF apresentado como álbum" é `album` + ingestor `pdf`, sem tipo novo
- "Diário com fotos" é rodar o ingestor `photos` num volume existente, a qualquer momento
- Um conceito armazenado a **menos** que a opção B, e nenhuma combinatória
- Capacidades de edição derivam do conteúdo (uma página de blocos `scan` não é editável
  como texto porque é raster), não de um tipo declarado
- A UX de criação continua idêntica à da opção A

### Negative Consequences

- Não existe campo direto para consultar "todos os livros vindos de PDF"; é preciso ler
  `provenance`, que é mais caro e menos indexável
- Há dois conceitos a explicar (surface e ingestor) onde a opção A tinha um
- `provenance` é estrutura que só rende valor depois, quando existir reimportação — hoje
  é custo sem retorno imediato

## Pros and Cons of the Options

### D — Superfície + ingestores + provenance ✅ Escolhida

- ✅ Zero combinatória; absorve RPG, álbum e cartas sem tipo novo
- ✅ Menos estado armazenado que B
- ✅ Preserva a UX simples de A via presets
- ❌ Consultar por origem exige varrer `provenance`

### A — Registry de `kind`

- ✅ Um lugar só para olhar; o mais fácil de explicar e de entregar primeiro
- ❌ Combinatória: 4 origens × 4 apresentações = 16 pacotes
- ❌ "Diário com fotos" exige um tipo novo inteiro

### B — `source` × `surface` armazenados

- ✅ Explícito e fácil de consultar por qualquer eixo
- ❌ Engessa: um diário nasce "de escrita" e receber fotos depois fica conceitualmente errado
- ❌ Um campo a mais sem ganho sobre D

### C — Capabilities, sem tipo

- ✅ Flexibilidade máxima, zero combinatória
- ❌ Dissolve a identidade do produto: "criar um diário" vira "criar um livro e ligar três flags"
- ❌ Registry difuso, sem lugar natural para tema e layouts

## Links

- [Linguagem ubíqua](../domain/ubiquitous-language.md) — definição de surface, ingestor, provenance
- [Mapa de contextos](../domain/bounded-contexts.md) — Composition e Ingestion
- `AD-006`, `AD-007` em [STATE.md](../../.specs/STATE.md)
