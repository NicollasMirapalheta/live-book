# Fase 0 — Fundação de correção

**Escopo**: Large
**Status**: Draft

## Problem Statement

O projeto não tem um único teste. `AD-016` tornou o gate de teste obrigatório desde a
primeira fase, então nada de produto pode ser construído antes de existir suíte.

Duas coisas precisam de rede **antes** de qualquer código novo. Primeiro, as conversões
entre unidades de paginação: são a fonte do único bug conhecido do projeto (capítulos um
spread adiante) e estão prestes a ganhar cinco novos pontos de conversão. Segundo, o
comportamento atual do motor, que será alterado na Fase 3 para o modo retrato — alterar
código declarado intocável sem caracterização prévia é o cenário clássico de regressão
silenciosa.

## Goals

- [ ] `npm run test` roda a suíte e serve de gate verificável em toda task subsequente
- [ ] `src/book/units.ts` é a fonte única das conversões, com as quatro fórmulas testadas exaustivamente
- [ ] O motor tem testes de caracterização **escritos sem alterar uma linha** de `src/live-book/`

## Out of Scope

| Item | Motivo |
|---|---|
| Playwright / e2e | Fase 3, quando existir imagem e retrato para verificar |
| Testes de `migrateDoc` | `migrate.ts` só nasce na Fase 1 |
| Qualquer mudança visual | Fase 0 não altera nada que o usuário veja |
| Corrigir `shot.mjs` | registrado em `CLAUDE.md`; não bloqueia esta fase |
| Refatorar o motor | `AD-022`; a fase existe justamente para protegê-lo |
| Cobertura por percentual | substituída pela matriz por critério de aceite |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| A casca tem exatamente 2 faces antes do miolo | `faceOfPageNumber(n) = n + 1` | é a montagem atual (capa na face 0, guarda na face 1) | s |
| jsdom não tem `ResizeObserver` | stub no arquivo de setup | `useStageScale` observa o viewport e lançaria `ReferenceError` | s |
| jsdom não tem `AudioContext` | nenhum stub necessário | `usePageSound` já degrada sozinho (`if (!Ctx) return null`, [usePageSound.ts:27](../../../src/live-book/usePageSound.ts)); com `sound={false}` nem chega lá | s |
| `getBoundingClientRect` devolve zeros em jsdom | aceitar; a escala fica no valor de `estimate()` | `measure()` retorna cedo quando não há dimensão ([useStageScale.ts:25](../../../src/live-book/useStageScale.ts)); os testes são estruturais, não visuais | s |
| `pageNumberOfFace` numa face de casca | devolve `null`, não lança | derrubar o leitor por um detalhe de numeração é pior que forçar o chamador a tratar | s |
| Conversões usam `LeafIndex` de folha, não estado de leitura | mesmo tipo para ambos | são a mesma grandeza; distinguir criaria um tipo sem valor prático | s |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Gate de teste executável ⭐ MVP

**User Story**: Como desenvolvedor, quero um comando único que roda a suíte, para que o
`Done when` de cada task seja verificável por máquina e não por autoavaliação.

**Why P1**: Sem isso, nenhuma task de nenhuma fase pode ser concluída conforme `AD-016`.

**Acceptance Criteria**:

1. QUANDO `npm run test` é executado ENTÃO o sistema DEVE rodar a suíte uma vez (sem watch)
   e sair com código 0 se todos os testes passarem
2. QUANDO qualquer teste falha ENTÃO o comando DEVE sair com código diferente de 0
3. QUANDO `npm run test:watch` é executado ENTÃO o sistema DEVE reexecutar os testes afetados a cada alteração
4. QUANDO um teste renderiza um componente que usa `ResizeObserver` ENTÃO o sistema NÃO DEVE lançar `ReferenceError`
5. QUANDO `npm run typecheck` é executado ENTÃO os arquivos de teste DEVEM ser incluídos na checagem

**Independent Test**: rodar `npm run test` num repositório recém-clonado após `npm install`
e ver a suíte executar e reportar.

---

### P1: Unidades de paginação como tipos distintos ⭐ MVP

**User Story**: Como desenvolvedor, quero que face, folha e número impresso sejam tipos
incompatíveis, para que o compilador rejeite a confusão que já causou um bug em produção.

**Why P1**: Cinco novos pontos de conversão chegam nas próximas fases (rotas, sumário,
trilho, import, side menu). Sem isso, a classe de bug se repete e o sintoma — conteúdo
certo na posição errada — passa por revisão humana.

**Acceptance Criteria**:

1. QUANDO `leafOfFace(f)` recebe um `FaceIndex` ENTÃO DEVE devolver `ceil(f / 2)` tipado como `LeafIndex`
2. QUANDO `leafOfPageNumber(n)` recebe um `PageNumber` ENTÃO DEVE devolver `ceil((n + 1) / 2)`
3. QUANDO `faceOfPageNumber(n)` recebe um `PageNumber` ENTÃO DEVE devolver `n + 1` tipado como `FaceIndex`
4. QUANDO `pageNumberOfFace(f)` recebe uma face de miolo ENTÃO DEVE devolver `f - 1` tipado como `PageNumber`
5. QUANDO `pageNumberOfFace(f)` recebe uma face de casca (`f < 2`) ENTÃO DEVE devolver `null`
6. QUANDO código passa um `PageNumber` onde `LeafIndex` é esperado ENTÃO a compilação DEVE falhar
7. QUANDO `pageNumberOfFace(faceOfPageNumber(n))` é avaliado para qualquer `n ≥ 1` ENTÃO DEVE devolver `n`

**Independent Test**: tabela de conversões com valores conhecidos (`leafOfFace(0) = 0`,
`leafOfFace(1) = 1`, `leafOfFace(2) = 1`, `leafOfFace(3) = 2`) e uma asserção de tipo que
falha ao compilar.

---

### P1: Caracterização do motor ⭐ MVP

**User Story**: Como desenvolvedor, quero testes que descrevem o comportamento atual do
motor, para poder alterar `stageOffset` e `useStageScale` na Fase 3 sabendo imediatamente
se algo regrediu.

**Why P1**: `AD-022` declara o motor intocável, mas `AD-005` já autorizou alterá-lo. Um
arquivo protegido que será modificado sem rede é o pior dos dois mundos.

**Acceptance Criteria**:

1. QUANDO o `LiveBook` é montado com N páginas de miolo ENTÃO a sequência de faces DEVE
   ser capa, guarda, N páginas, guarda, contracapa — nesta ordem
2. QUANDO o total de faces resultaria ímpar ENTÃO o sistema DEVE inserir exatamente uma
   face de enchimento antes da guarda final
3. QUANDO o livro tem F faces ENTÃO `leaves` DEVE ser `F / 2`
4. QUANDO uma página declara `chapter` ENTÃO ela DEVE aparecer no sumário associada à
   folha `ceil(f / 2)`, onde `f` é o índice da sua face
5. QUANDO a primeira página de miolo é exibida ENTÃO seu número impresso DEVE ser 1
6. QUANDO `windowRadius` é 2 ENTÃO o número de folhas montadas no DOM DEVE ser no máximo 7
   (5 da janela, mais capa e contracapa quando fora dela)
7. QUANDO a suíte de caracterização passa ENTÃO `git diff --stat src/live-book/` DEVE
   estar vazio

**Independent Test**: montar o `LiveBook` com 10 páginas, contar as faces no DOM e conferir
a ordem dos tipos, sem tocar no componente.

---

## Edge Cases

- QUANDO o miolo tem 0 páginas ENTÃO o livro DEVE montar apenas casca, e `leaves` DEVE ser 2
- QUANDO o miolo tem exatamente 1 página ENTÃO o enchimento DEVE ser inserido (total ímpar)
- QUANDO `leafOfFace(0)` é avaliado ENTÃO DEVE devolver 0 (capa visível com o livro fechado)
- QUANDO `pageNumberOfFace(1)` é avaliado ENTÃO DEVE devolver `null` (guarda não numera)
- QUANDO nenhuma página declara `chapter` ENTÃO o sumário DEVE ser uma lista vazia, sem erro
- QUANDO `windowRadius` recebe 0 ENTÃO o motor DEVE aplicar o piso 1 (o spread precisa de duas folhas)

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| FUND-01 | P1: Gate de teste | Tasks | Pending |
| FUND-02 | P1: Gate de teste (ambiente jsdom) | Tasks | Pending |
| FUND-03 | P1: Unidades — conversões | Tasks | Pending |
| FUND-04 | P1: Unidades — incompatibilidade de tipo | Tasks | Pending |
| FUND-05 | P1: Caracterização — montagem de faces | Tasks | Pending |
| FUND-06 | P1: Caracterização — sumário e numeração | Tasks | Pending |
| FUND-07 | P1: Caracterização — janela de virtualização | Tasks | Pending |

**Cobertura:** 7 requisitos, 7 mapeados para tasks, 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run test` e `npm run typecheck` verdes num clone limpo
- [ ] Toda fórmula de conversão da linguagem ubíqua tem teste tabelado com valor esperado explícito
- [ ] `git diff --stat src/live-book/` vazio ao fim da fase
- [ ] A suíte roda em menos de 10 segundos (é gate de cada task; lenta demais, será contornada)
