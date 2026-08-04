# Fase 1 — Documento e renderer

**Escopo**: Large
**Status**: Draft

## Problem Statement

Hoje o conteúdo do livro é JSX escrito à mão em `src/App.tsx`. Não existe representação
serializável de um volume, então não há como salvar, carregar, editar ou importar nada —
todo o roadmap depende de uma camada que ainda não existe.

Esta fase introduz o `BookDoc` e a tradução dele em páginas, **sem mudar um pixel na tela**.
O demo atual passa a ser gerado a partir de um documento, o que prova o schema contra
conteúdo real antes de existir editor — se algo não for expressável, o custo de mudar o
schema agora é zero.

## Goals

- [ ] `BookDoc` expressa integralmente o conteúdo do demo atual
- [ ] `renderPages` traduz documento em páginas preservando sumário, numeração e virtualização
- [ ] Adicionar uma surface é registrar, sem editar o motor nem o renderer
- [ ] O livro renderizado do documento é indistinguível do `App.tsx` de hoje

## Out of Scope

| Item | Motivo |
|---|---|
| Persistência e backend | Fase 2 — o documento aqui vem de módulo TypeScript |
| Upload e pipeline de imagem | Fase 3 |
| **Surface `album`** | **movida para a Fase 3** — ver Mudança de escopo abaixo |
| Editor visual | Fase 4 |
| Rotas | Fase 2 |
| Modo retrato | Fase 3 |

### Mudança de escopo em relação ao roadmap

O roadmap previa entregar `album` e `manuscript` nesta fase. O trabalho de spec mostrou que
isso é construir às cegas: a surface `album` existe para apresentar fotos, e não há como
colocar foto num volume antes do pipeline de mídia (Fase 3). Entregá-la agora significaria
desenhar tema, layouts e molduras sem nunca ver uma foto real dentro deles.

**Decisão:** Fase 1 entrega `manuscript` completa — que é o que o demo já é, e serve de
referência. `album` passa para a Fase 3, junto do pipeline que a torna exercitável. Os
blocos `image` e `gallery` **são** entregues aqui, renderizando a partir de `AssetRef`,
para que a Fase 3 só precise plugar a origem dos arquivos.

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Bloco com `type` não registrado | renderiza `null` na leitura, card de aviso no editor; **nunca some do documento** | salvar num cliente antigo apagaria conteúdo do usuário | s |
| Documento com `schemaVersion` maior que o do cliente | abre em somente-leitura | salvar destruiria campos desconhecidos | s |
| `migrateDoc` roda no carregamento | nunca no save | migrar ao salvar propaga versão sem o usuário pedir | s |
| Surface desconhecida | fallback com blocos de núcleo, sem tema | um volume nunca deve ficar inabrível | s |
| Bloco que lança durante o render | isolado, não derruba a página | um bloco corrompido não pode tornar o volume inteiro inacessível | s |
| `ctx.assetUrl` na Fase 1 | identidade sobre caminho estático | Fase 2 substitui pela do adapter, sem mudar os blocos | s |
| Capa e contracapa | `CoverSpec` de blocos, mesmo pipeline das páginas | permite editar a capa com o mesmo editor depois | s |
| Ordem das páginas | posição no array `doc.pages` | não há campo de ordenação; reordenar é mover no array | s |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## Dimensões implícitas

| Dimensão | Cobertura |
|---|---|
| Validação e limites | `migrateDoc` rejeita documento sem `schemaVersion`; limites de tamanho ficam para a Fase 2, onde há escrita |
| Falha e falha parcial | bloco desconhecido, surface desconhecida, bloco que lança — todos com comportamento definido acima |
| Idempotência | `renderPages` é pura e determinística; `migrateDoc` aplicado a documento já migrado é no-op |
| Fronteiras de autorização | N/A — não há escrita nem rede nesta fase |
| Concorrência e ordenação | N/A — render é síncrono e de thread única |
| Ciclo de vida do dado | N/A — sem persistência nesta fase |
| Observabilidade | bloco que lança registra o `type` e o `id` no console; sem telemetria ainda |
| Falha de dependência externa | N/A — sem dependência externa nesta fase |
| Integridade de transição de estado | N/A — o documento não tem máquina de estados |

---

## User Stories

### P1: Documento serializável ⭐ MVP

**User Story**: Como desenvolvedor, quero um `BookDoc` em JSON que descreva um volume
inteiro, para que ele possa ser salvo, carregado, editado e importado nas fases seguintes.

**Why P1**: É a fundação de todo o resto do roadmap.

**Acceptance Criteria**:

1. QUANDO um `BookDoc` é serializado com `JSON.stringify` e desserializado ENTÃO o resultado DEVE ser estruturalmente igual ao original
2. QUANDO um bloco tem `type` não registrado ENTÃO ele DEVE permanecer intacto no documento após um ciclo de leitura e escrita
3. QUANDO `migrateDoc` recebe documento sem `schemaVersion` ENTÃO DEVE lançar erro descritivo
4. QUANDO `migrateDoc` recebe documento com `schemaVersion` maior que `SCHEMA_VERSION` ENTÃO DEVE devolvê-lo marcado como somente-leitura
5. QUANDO `migrateDoc` recebe documento já na versão corrente ENTÃO DEVE devolvê-lo sem alteração

**Independent Test**: construir um documento com um bloco `type: "inventado"`, passar por
`migrateDoc` e `JSON.stringify`, e confirmar que o bloco continua lá.

---

### P1: Tradução para páginas preservando o contrato do motor ⭐ MVP

**User Story**: Como desenvolvedor, quero que o documento vire páginas sem que o motor
saiba que documentos existem, para que sumário, numeração e virtualização continuem
funcionando e adicionar surface não vire um `if` no núcleo.

**Why P1**: É a fronteira que sustenta a arquitetura ([ADR-002](../../../docs/adr/002-traducao-de-documento-por-funcao-pura.md)).

**Acceptance Criteria**:

1. QUANDO `renderPages(doc, ctx)` recebe um documento com N páginas ENTÃO DEVE devolver exatamente N elementos, na ordem de `doc.pages`
2. QUANDO uma página declara `chapter`, `title`, `tone` ou `hideNumber` ENTÃO essas props DEVEM chegar ao elemento `<Page>` correspondente
3. QUANDO `renderPages` é chamada ENTÃO ela NÃO DEVE construir a árvore de blocos — cada elemento devolvido tem no máximo um filho
4. QUANDO a mesma referência de documento é passada duas vezes ENTÃO a saída DEVE ser estruturalmente idêntica (função pura)
5. QUANDO uma página tem `id` estável ENTÃO a `key` do elemento DEVE ser esse `id`
6. QUANDO o documento é renderizado dentro do `LiveBook` ENTÃO o sumário DEVE conter uma entrada para cada página com `chapter`, na folha correta

**Independent Test**: chamar `renderPages` com 300 páginas e contar os nós criados —
deve ser proporcional a 300, não à quantidade total de blocos.

---

### P1: Blocos de núcleo ⭐ MVP

**User Story**: Como autor, quero blocos de conteúdo que cubram texto, imagem e estrutura,
para poder expressar as páginas do meu volume.

**Why P1**: Sem blocos não há conteúdo, e o demo não pode virar documento.

**Acceptance Criteria**:

1. QUANDO um documento usa `heading`, `text`, `image`, `gallery`, `quote`, `callout`, `rule` ou `spacer` ENTÃO cada um DEVE renderizar o HTML correspondente
2. QUANDO um bloco `image` é renderizado ENTÃO DEVE emitir `width` e `height` a partir do `AssetRef`, para reservar a caixa e evitar deslocamento de layout
3. QUANDO um bloco tem `type` não registrado ENTÃO a página DEVE renderizar sem ele, e o restante da página DEVE aparecer normalmente
4. QUANDO o render de um bloco lança exceção ENTÃO o volume DEVE continuar navegável e o erro DEVE ser registrado com `type` e `id`
5. QUANDO um bloco `text` contém HTML ENTÃO ele DEVE ser renderizado como HTML — o conteúdo é do próprio autor

---

### P1: Registry de surfaces ⭐ MVP

**User Story**: Como desenvolvedor, quero registrar uma surface nova sem editar o renderer
nem o motor, para que os tipos futuros (`journal`, `scan`, RPG) não exijam refatoração.

**Why P1**: É a decisão estrutural da [ADR-001](../../../docs/adr/001-superficie-como-unico-eixo-de-variacao.md).

**Acceptance Criteria**:

1. QUANDO uma surface é registrada ENTÃO seus blocos exclusivos DEVEM ficar disponíveis apenas para volumes daquela surface
2. QUANDO um volume declara surface não registrada ENTÃO o sistema DEVE renderizar com os blocos de núcleo e sem tema, sem lançar
3. QUANDO uma surface define `theme` ENTÃO os valores DEVEM ser aplicados como custom properties `--lb-*` inline no root do `LiveBook`
4. QUANDO uma surface define `defaultWindowRadius` ENTÃO esse valor DEVE chegar ao motor como `windowRadius`
5. QUANDO os blocos de núcleo são consultados ENTÃO DEVEM estar disponíveis para toda surface, sem registro

---

### P1: Demo idêntico, vindo de documento ⭐ MVP

**User Story**: Como desenvolvedor, quero o demo atual gerado a partir de um `BookDoc`,
para provar que o schema expressa conteúdo real antes de existir editor.

**Why P1**: É o teste de aceite do schema inteiro.

**Acceptance Criteria**:

1. QUANDO o app é aberto ENTÃO o livro exibido DEVE ter os mesmos capítulos no sumário que a versão atual
2. QUANDO o livro é folheado ENTÃO a numeração impressa DEVE coincidir página a página com a versão atual
3. QUANDO o livro é aberto ENTÃO as fitas de capítulo DEVEM aparecer nas mesmas posições
4. QUANDO algum conteúdo do demo não for expressável pelo schema ENTÃO o schema DEVE ser corrigido — **não** o conteúdo

**Independent Test**: comparar capturas antes e depois, e conferir a lista de capítulos e
a numeração.

---

### P2: Mudanças aditivas no motor

**User Story**: Como desenvolvedor, quero as props de chassi que as fases seguintes exigem,
adicionadas agora enquanto o contexto está fresco.

**Why P2**: Não são necessárias para o demo funcionar, mas evitam reabrir o motor depois.

**Acceptance Criteria**:

1. QUANDO `style` é passada ao `LiveBook` ENTÃO suas custom properties DEVEM ser aplicadas no root, sem sobrescrever `--lb-cover-square`
2. QUANDO `apiRef` é passada ENTÃO DEVE expor `goTo`, `leaves` e `getLeaf`
3. QUANDO o foco está num elemento `contentEditable` e uma seta é pressionada ENTÃO a página NÃO DEVE virar
4. QUANDO essas mudanças são aplicadas ENTÃO todos os testes de caracterização da Fase 0 DEVEM continuar passando

---

## Edge Cases

- QUANDO `doc.pages` está vazio ENTÃO o volume DEVE montar só a casca, sem lançar
- QUANDO uma página tem `blocks: []` ENTÃO ela DEVE renderizar em branco, mas continuar contando para a numeração
- QUANDO dois blocos têm o mesmo `id` ENTÃO o render DEVE funcionar e o problema DEVE ser registrado (React alertaria sobre chave duplicada)
- QUANDO um `AssetRef` não tem `w`/`h` ENTÃO o bloco `image` DEVE renderizar sem reserva de caixa, sem quebrar
- QUANDO `doc.theme` está ausente ENTÃO o tema da surface DEVE prevalecer; ausentes os dois, vale o tema do motor
- QUANDO uma página declara `layout` não registrado pela surface ENTÃO DEVE cair no fluxo padrão

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| DOC-01 | P1: Documento serializável | Design | Pending |
| DOC-02 | P1: Documento — migração e bloco desconhecido | Design | Pending |
| DOC-03 | P1: Tradução — ordem, props e pureza | Design | Pending |
| DOC-04 | P1: Tradução — elementos rasos (virtualização) | Design | Pending |
| DOC-05 | P1: Blocos de núcleo | Design | Pending |
| DOC-06 | P1: Blocos — isolamento de falha | Design | Pending |
| DOC-07 | P1: Registry de surfaces | Design | Pending |
| DOC-08 | P1: Surface `manuscript` e tema | Design | Pending |
| DOC-09 | P1: Demo como documento | Design | Pending |
| DOC-10 | P2: Mudanças aditivas no motor | Design | Pending |

**Cobertura:** 10 requisitos, 0 mapeados para tasks (Design pendente).

---

## Success Criteria

- [ ] O demo vindo de documento é visualmente indistinguível do atual
- [ ] `renderPages` com 300 páginas executa em menos de 5 ms
- [ ] Os testes de caracterização da Fase 0 continuam verdes após as mudanças no motor
- [ ] Registrar uma surface nova não exige alterar nenhum arquivo existente
- [ ] Nenhum `import` de `src/book/` dentro de `src/live-book/`
