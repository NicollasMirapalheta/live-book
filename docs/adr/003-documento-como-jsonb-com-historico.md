# ADR-003: Documento persistido como JSONB único com histórico de revisões

- **Date**: 2026-08-03
- **Status**: Accepted
- **Deciders**: nicollasMirapalheta
- **Tags**: database, data-modeling, durability

## Context and Problem Statement

O `BookDoc` é uma árvore: volume → páginas → blocos. Precisa ser lido inteiro para
renderizar e salvo com frequência durante a edição. Um álbum de 300 páginas fica em
~180 KB, porque guarda apenas referências de asset, não as imagens.

A modelagem relacional clássica normalizaria páginas e blocos em tabelas próprias. Além
disso, o desenho original não previa histórico: `save_book` sobrescrevia, o que significa
que um bug no editor apagaria semanas de diagramação sem recuperação possível — risco
inaceitável para um artefato construído à mão ao longo de semanas.

## Decision Drivers

- Save precisa ser atômico: um volume nunca pode ficar meio salvo
- Leitura é sempre do documento inteiro; não existe caso de uso de "carregar só a página 40"
- Edição gera saves frequentes (autosave com debounce)
- Perda de conteúdo autoral é o pior resultado possível do sistema
- Plano free do Supabase: 500 MB de banco

## Considered Options

- **A** — Tabelas normalizadas: `books`, `pages`, `blocks`
- **B** — Coluna `jsonb` única, sem histórico
- **C** — Coluna `jsonb` única + tabela append-only de revisões

## Decision Outcome

Escolhida a **opção C**. O documento vive em `books.doc jsonb`, e cada save grava a
versão anterior em `book_revisions`, mantendo as últimas N restauráveis. Concorrência é
resolvida por `rev`: save com `rev` divergente levanta conflito e nunca sobrescreve em
silêncio.

O gatilho de migração para a opção A está definido de antemão: `pg_column_size(doc) > 1 MB`
ou autosave acima de 400 ms. Na prática só a surface `scan` (PDF rasterizado com texto
extraído) chega lá. Quando chegar, muda-se apenas `SupabaseAdapter.getBook/saveBook` —
nenhum consumidor é afetado, porque a interface fala em `BookDoc` inteiro.

### Positive Consequences

- Save atômico e leitura em um round-trip, sem joins
- Migração de schema do documento é código TypeScript versionado (`migrateDoc`), não DDL
- Histórico protege o livro-presente de bug no editor, com restauração pelo usuário
- Blocos de `type` desconhecido sobrevivem ao round-trip, porque o JSON é opaco ao banco

### Negative Consequences

- O documento inteiro trafega a cada save — ~180 KB e ~120 ms num link ruim
- Sem consulta relacional: "quantas páginas usam bloco de galeria" exige operadores JSONB
  ou varredura no cliente
- `book_revisions` consome armazenamento proporcional ao número de saves; mitigado pelo
  teto N e pela poda no próprio `save_book`
- Duas fontes de verdade para o tamanho do volume (`page_count` denormalizado e
  `jsonb_array_length(doc->'pages')`), que precisam ser escritas na mesma transação

## Pros and Cons of the Options

### C — JSONB + revisões ✅ Escolhida

- ✅ Atômico, simples, e protege contra perda de conteúdo
- ✅ Escape hatch para a opção A já definido, sem afetar chamadores
- ❌ Payload cheio a cada save; custo de armazenamento do histórico

### B — JSONB sem histórico

- ✅ O mais simples e barato
- ❌ Um save ruim destrói o trabalho, sem recuperação
- ❌ Retrofitar histórico depois é caro justamente porque o dado já se perdeu

### A — Tabelas normalizadas

- ✅ Consultas relacionais e save parcial de uma página só
- ✅ Escala para documentos grandes sem tráfego cheio
- ❌ Save de um volume vira transação multi-tabela, com risco de estado parcial
- ❌ Cada bloco novo exige DDL e migração de banco, não só código
- ❌ Complexidade desproporcional ao caso de uso real (sempre lê tudo)

## Links

- [ADR-004](004-escrita-anonima-por-token-de-edicao.md) — como `save_book` autoriza
- `AD-011`, `AD-018` em [STATE.md](../../.specs/STATE.md)
