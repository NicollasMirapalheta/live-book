# ADR-002: Tradução de documento para páginas por função pura

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: architecture, performance, react

## Context and Problem Statement

O `LiveBook` recebe conteúdo exclusivamente como `children` JSX e extrai metadados por
introspecção: `Children.toArray(children).filter(isValidElement)` monta a sequência de
faces ([LiveBook.tsx:146](../../src/live-book/LiveBook.tsx)), o sumário lê
`face.el.props.chapter` e `.title` ([:229](../../src/live-book/LiveBook.tsx)), e
`surfaceOf` lê `props.tone` e `props.hideNumber` ([:79](../../src/live-book/LiveBook.tsx)).

Introduzir um documento declarativo (`BookDoc`) exige uma camada que traduza dados em
páginas. A questão é onde essa camada mora sem destruir o que o motor já faz.

## Decision Drivers

- Sumário, numeração, fitas de capítulo e barra de progresso são derivados das props dos
  filhos e não podem parar de funcionar
- A virtualização precisa sobreviver: montar 300 páginas de uma vez mata a máquina alvo
- O motor acabou de ser afinado (de ~3 para ~37 FPS com 300 páginas sob throttle 4x);
  mudanças nele são caras e arriscadas
- Adicionar uma surface nova não pode virar um `if` dentro do motor

## Considered Options

- **A** — `<BookRenderer doc={} />` como filho do `LiveBook`
- **B** — `LiveBook` ganha prop `doc` e passa a conhecer o documento
- **C** — `renderPages(doc, ctx)`: função pura que devolve `ReactElement<PageProps>[]`

## Decision Outcome

Escolhida a **opção C**. `renderPages` é uma função pura de módulo que devolve um array
de elementos `<Page>` rasos, cada um contendo um `<PageBody>` que só constrói a árvore de
blocos quando o React efetivamente o monta — ou seja, quando a folha entra na janela de
virtualização.

A opção A foi eliminada por construção, não por preferência: um componente wrapper vira
**uma** face cujas props são `{doc}`, e sumário, numeração e paginação deixam de existir.

### Positive Consequences

- O motor permanece JSX-first e nunca conhece documento, bloco, surface ou ingestor
- 300 páginas produzem 600 `createElement` rasos; o custo de montagem continua O(janela)
- `surfaceCache` e `Leaf = memo()` continuam válidos sem alteração
- A função é memoizável e testável sem DOM — é o alvo natural dos primeiros testes
- Adicionar uma surface é registrar, não editar o motor

### Negative Consequences

- O tema precisa ser traduzido para custom properties `--lb-*` na borda, porque o motor
  recebe cores e não conceitos
- Qualquer mudança no documento invalida `surfaceCache` (memoizado por `faces`) e
  reconstrói as ~10 superfícies montadas; o editor precisa fazer commit em blur ou
  debounce, nunca a cada tecla
- Duas camadas de indireção entre dado e pixel, o que dificulta um pouco o debug

## Pros and Cons of the Options

### C — Função pura ✅ Escolhida

- ✅ Única forma compatível com a introspecção de props do motor
- ✅ Preserva virtualização, memoização e cache existentes
- ✅ Pura: testável, memoizável, sem I/O
- ❌ Exige `PageBody` como camada extra para adiar a construção dos blocos

### A — Componente wrapper

- ✅ Seria o mais idiomático em React
- ❌ **Não funciona**: vira uma face só; mata sumário, numeração e paginação
- ❌ Falha silenciosa e difícil de diagnosticar

### B — Prop `doc` no `LiveBook`

- ✅ API mais simples de usar do lado do chamador
- ❌ Puxa o modelo de documento para dentro do motor
- ❌ Cada surface nova vira um `if` no núcleo — exatamente o acoplamento que o projeto evita
- ❌ Torna o motor irreutilizável fora deste produto

## Links

- [ADR-001](001-superficie-como-unico-eixo-de-variacao.md) — o eixo que o registry resolve
- [Mapa de contextos](../domain/bounded-contexts.md) — a fronteira Reading ↔ Composition
- `AD-008`, `AD-009`, `AD-022` em [STATE.md](../../.specs/STATE.md)
