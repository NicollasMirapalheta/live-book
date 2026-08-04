# Estratégia de testes

O projeto adota o gate da `tlc-spec-driven` desde a primeira fase (`AD-016`): **testes
derivam dos critérios de aceite da spec e nunca espelham a implementação**, e a suíte
decide se uma tarefa está pronta — não a autoavaliação.

Isso supersede o plano original, que adiava testes até a fase de import de PDF.

---

## Por que agora, e não depois

O núcleo do produto é conversão de dados: documento → faces → páginas → pixels. Os bugs
desse tipo são **silenciosos** — nada quebra, o conteúdo só aparece no lugar errado. O
bug histórico da v1 (capítulos um spread adiante) é exatamente isso, e passou por
revisão humana.

Adiar teste até a Fase 6 deixaria sem rede justamente `units.ts`, `migrateDoc` e o
`StorageAdapter` — as três coisas onde um erro corrompe dado do usuário em vez de
apenas exibir errado.

---

## Stack

| Camada | Ferramenta | Situação |
|---|---|---|
| Tipos | `tsc --noEmit` (`npm run typecheck`) | já existe |
| Unitário e contrato | **Vitest** | a adicionar |
| Componente | **@testing-library/react** + jsdom | a adicionar |
| E2E, visual e performance | **Playwright** | já é dependência |

Vitest e não Jest: o projeto é Vite, e reusar a mesma resolução de módulos e o mesmo
pipeline de transformação elimina uma configuração paralela inteira.

> **Pendência conhecida:** `shot.mjs` tem `executablePath` fixo num caminho Linux
> (`/opt/pw-browsers/...`), então `npm run shots` não roda neste Windows. Precisa passar
> a resolver o browser pelo próprio Playwright antes de virar parte do gate.

---

## As cinco camadas

### L1 — Funções puras ⭐ maior valor

Alvos: `book/units.ts`, `book/migrate.ts`, `book/factory.ts`, dimensionamento em
`media/imageProcess.ts`.

Rápidos, determinísticos, exaustivos. É onde mora a lógica que, se errar, corrompe.

`units.ts` merece teste **tabelado**, cobrindo toda a sequência de faces:

| Entrada | Esperado | Por quê |
|---|---|---|
| `leafOfFace(0)` | 0 | capa aparece com o livro fechado |
| `leafOfFace(1)` | 1 | guarda é verso; só aparece com a capa virada |
| `leafOfFace(2)` | 1 | primeira página do miolo, à direita |
| `leafOfFace(3)` | 2 | verso da primeira folha do miolo |
| `leafOfPageNumber(1)` | 1 | página impressa 1 |
| `pageNumberOfFace(2)` | 1 | conversão inversa |
| ida e volta | idempotente | `pageNumberOfFace(faceOfPageNumber(n)) === n` |

`migrateDoc` precisa cobrir: cadeia de versões, documento de versão **futura** abrindo
em somente-leitura, e — o mais importante — **bloco de `type` desconhecido sobrevivendo
ao round-trip**. Perder isso apaga conteúdo do usuário silenciosamente.

### L2 — Contrato do renderer

`renderPages(doc, ctx)` é pura, então testa-se sem DOM:

- produz um elemento por página de `doc.pages`, na ordem
- propaga `chapter`, `title`, `tone`, `hideNumber` para o `<Page>` — **é o contrato com
  o sumário do motor**; se quebrar, o sumário some sem erro
- `key` é o `page.id`, estável entre renders
- **não** constrói a árvore de blocos (verificável contando os nós do elemento retornado)

Este último é o que protege a virtualização. Um refactor bem-intencionado que "simplifica"
`PageBody` para fora e monta blocos direto passaria em todo teste visual e derrubaria a
performance com 300 páginas.

### L3 — Contrato do StorageAdapter ⭐ maior alavancagem

Existem três implementações da mesma interface. Escreve-se **uma** suíte e roda-se contra
todas:

```ts
// data/__tests__/adapter.contract.ts
export function runAdapterContract(name: string, make: () => Promise<StorageAdapter>) {
  describe(`StorageAdapter: ${name}`, () => {
    it("createBook devolve id e rev inicial", …)
    it("getBook devolve o documento salvo, sem perda", …)
    it("saveBook com rev divergente lança RevConflictError", …)
    it("deleteBook remove e getBook passa a devolver null", …)
    it("assetUrl é síncrona e devolve string", …)
    it("gcAssets preserva os assets em uso", …)
    it("bloco desconhecido sobrevive ao round-trip", …)
  });
}
```

Isso é o que garante que a interface não vazou detalhe de Postgres — se o `LocalAdapter`
não passa, a abstração está errada, e descobre-se em segundos em vez de no dia da
migração.

`PublicAdapter` roda o subconjunto de leitura e precisa **falhar** em toda escrita.

### L4 — Componente

Só onde há comportamento não óbvio, com `@testing-library/react`:

- `RichText`: digitar não dispara commit; blur dispara; o caret não é reposicionado
  durante autosave
- Undo/redo restaura exatamente o estado anterior, e refazer volta
- Trilho de páginas: reordenar produz a nova ordem no documento
- Guarda de teclado: com foco em `contentEditable`, seta direita **não** vira a página
  (regressão do defeito conhecido)

Não testar animação com RTL. jsdom não tem layout, e o resultado é teste frágil que
falha por motivo errado.

### L5 — E2E, visual e performance

Playwright, no `dist` servido:

- **Jornada:** criar volume → subir 3 fotos → editar legenda → recarregar → conteúdo persiste
- **Compartilhamento:** abrir `/s/:token` em contexto anônimo → conteúdo visível, nenhum
  controle de edição presente
- **Retrato:** viewport 390×844 → página legível **e a virada 3D funcionando** (`AD-005`)
- **Visual:** capturas em pontos fixos (capa, meio da virada, spread, sumário) comparadas
  com referência
- **Acessibilidade:** percorrer o leitor só com Tab; nenhum elemento focável dentro de
  `aria-hidden`; foco visível em todo controle

---

## Testes de caracterização do motor

`src/live-book/` é intocável (`AD-022`), mas **vai** ser tocado: seis mudanças aditivas
mais o reenquadramento de retrato. Um arquivo declarado imutável e alterado mesmo assim é
o cenário clássico de regressão silenciosa.

Por isso o motor ganha testes que descrevem seu comportamento **atual** pela API pública,
antes de qualquer mudança:

- montagem de faces: capa, guarda, miolo, enchimento quando ímpar, guarda, contracapa
- `leaves === faces.length / 2`
- sumário derivado de `chapter`, com a folha correta por `ceil(f/2)`
- numeração impressa começando em 1 na primeira página de miolo
- janela de virtualização: com raio 2, contar as folhas montadas no DOM

São a rede que permite mexer no `stageOffset` para o modo retrato sem medo.

---

## Orçamento de performance como teste

As metas do projeto não podem ser folclore (`AD-014`). Viram números verificáveis via CDP
no Playwright:

| Métrica | Alvo | Como |
|---|---|---|
| FPS ao folhear, 300 páginas, CPU 4× | ≥ 30 | traço de performance, contagem de frames |
| Faces montadas com raio 2 | ≤ 10 | contagem de nós no DOM |
| Peso da variante `page` | ≤ 200 KB | asserção sobre o blob gerado |
| Tempo de `renderPages` com 300 páginas | ≤ 5 ms | benchmark em L1 |

Falha de orçamento é falha de build, não observação.

---

## Matriz de cobertura por critério de aceite

Cada spec traz uma tabela ligando requisito a teste. É o que impede "escrevi testes" de
virar métrica vazia:

| Requisito | Camada | Arquivo | Status |
|---|---|---|---|
| `DOC-01` | L1 | `units.test.ts` | — |
| `DOC-02` | L2 | `renderPages.test.tsx` | — |
| `DATA-03` | L3 | `adapter.contract.ts` | — |

Requisito sem teste mapeado é lacuna declarada, não descoberta em produção.

---

## O que não é testado

| Item | Por quê |
|---|---|
| CSS e valores visuais isolados | captura visual cobre com muito menos manutenção |
| Curvas de animação | verificar interpolação frame a frame é frágil e sem retorno |
| SDK do Supabase | é dependência de terceiro; testamos nosso adapter |
| Síntese de som (`usePageSound`) | efeito colateral em WebAudio, sem asserção significativa |
| Cobertura por percentual | a matriz por critério de aceite substitui; 90% de cobertura em getters não diz nada |

---

## Fluxo por tarefa

1. Ler o critério de aceite na spec (formato `QUANDO … ENTÃO … DEVE …`)
2. Escrever o teste que o expressa — falhando
3. Implementar até passar, sem enfraquecer o teste
4. `npm run typecheck` e a suíte relevante, verdes
5. Um commit atômico por tarefa
6. Ao fim da última tarefa, verificação independente contra a spec (autor ≠ verificador)

**Nunca** enfraquecer, pular ou apagar teste para fazer passar. Se o teste está errado,
o critério de aceite está errado, e o lugar de corrigir é a spec.
