# ADR-006: Unidades de paginação como tipos distintos

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: correctness, types, domain

## Context and Problem Statement

A palavra "página" significa quatro coisas diferentes no Live Book: índice de **face**
(0-based, inclui capa e guardas), índice de **folha** (0-based, cada uma com 2 faces),
**número impresso** (1-based, só miolo) e **`BookPage`** (unidade de conteúdo autoral).
Todas as três primeiras são `number` em TypeScript, e portanto intercambiáveis para o
compilador.

Essa ambiguidade já custou um bug: na v1 todo capítulo caía um spread adiante, corrigido
com `Math.ceil(f / 2)` em [LiveBook.tsx:241](../../src/live-book/LiveBook.tsx). O comentário
no código registra o episódio.

O roadmap adiciona **cinco novos pontos de conversão**: rotas (`/b/:id/p/:page`), sumário,
trilho do editor, import de PDF e side menu de troca rápida. Cada um é uma chance de
repetir exatamente o mesmo erro, e o sintoma — conteúdo certo, posição errada por um —
é dos mais difíceis de notar em revisão.

## Decision Drivers

- O erro é silencioso: nada quebra, só aparece no lugar errado
- Nenhum teste unitário natural cobre "o chamador passou a unidade errada"
- O custo de errar cresce com o número de conversões, e ele vai quintuplicar
- Performance é requisito, então a solução não pode ter custo em runtime

## Considered Options

- **A** — Convenção de nomes e comentários (`leafIndex`, `pageNumber`)
- **B** — Branded types com funções de conversão nomeadas
- **C** — Classes de value object (`new PageNumber(3)`)

## Decision Outcome

Escolhida a **opção B**. As três unidades numéricas viram branded types, e toda
conversão passa por funções nomeadas em `src/book/units.ts` — nunca reimplementadas
inline:

```ts
type FaceIndex  = number & { readonly __brand: "FaceIndex" };
type LeafIndex  = number & { readonly __brand: "LeafIndex" };
type PageNumber = number & { readonly __brand: "PageNumber" };

leafOfFace(f: FaceIndex): LeafIndex          // ceil(f / 2)
leafOfPageNumber(n: PageNumber): LeafIndex   // ceil((n + 1) / 2)
faceOfPageNumber(n: PageNumber): FaceIndex   // n + 1
pageNumberOfFace(f: FaceIndex): PageNumber   // f - 1, só para faces de miolo
```

`goTo(pageNumber)` passa a não compilar. As fórmulas ficam num arquivo só, que é também
o alvo natural dos primeiros testes unitários do projeto.

### Positive Consequences

- O compilador rejeita a classe inteira de erro que já ocorreu uma vez
- As fórmulas de conversão têm dono único e testável, em vez de estarem espalhadas
- Custo zero em runtime: brands somem na compilação, e os números continuam números
- Serve de documentação executável do vocabulário definido na linguagem ubíqua

### Negative Consequences

- Ruído de cast nas fronteiras onde o número entra sem tipo (parâmetro de rota, JSON
  do banco, atributo de DOM) — cada uma exige uma conversão explícita
- Branded types não são idiomáticos em React e vão parecer cerimônia a quem chegar depois
- Nada impede um cast errado deliberado; a proteção é contra descuido, não contra má-fé
- O motor (`src/live-book/`) permanece com `number` puro por ser intocável, então a
  fronteira entre tipado e não tipado fica no consumidor

## Pros and Cons of the Options

### B — Branded types ✅ Escolhida

- ✅ Erro vira falha de compilação, não bug em produção
- ✅ Zero custo em runtime
- ✅ Concentra as fórmulas num módulo testável
- ❌ Casts explícitos nas bordas; pouco idiomático

### A — Convenção de nomes

- ✅ Zero cerimônia, zero código novo
- ❌ Foi exatamente o que estava em vigor quando o bug aconteceu
- ❌ Não sobrevive a pressa nem a quem não leu o glossário

### C — Classes de value object

- ✅ Mais explícito, e permite comportamento junto do dado
- ❌ Alocação por conversão, num caminho que roda durante a animação
- ❌ Não serializa direto para JSON nem para parâmetro de rota
- ❌ Peso desproporcional para algo que é conceitualmente um inteiro

## Links

- [Linguagem ubíqua](../domain/ubiquitous-language.md) — as quatro unidades e as fórmulas canônicas
- `AD-010` em [STATE.md](../../.specs/STATE.md)
