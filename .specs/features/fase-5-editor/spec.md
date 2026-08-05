# Fase 5 — Editor visual

**Escopo**: Complex
**Status**: Draft
**Pré-requisito**: Fase 4 (Sistema de Design & UX) concluída — o editor é construído sobre o sistema de design, não antes dele (`AD-030`)

## Problem Statement

Tudo está no lugar — documento, persistência, rotas, imagens — mas montar um volume ainda
exige escrever TypeScript. O objetivo declarado do projeto é justamente o contrário:
"não quero ficar movendo arquivo".

Esta é a fase que torna o livro-presente possível de verdade. É também a que mais ameaça
a performance do motor, porque edição significa mudar o documento com frequência, e o
`surfaceCache` é memoizado por `faces` ([LiveBook.tsx:403](../../../src/live-book/LiveBook.tsx)):
qualquer alteração reconstrói as ~10 superfícies montadas.

## Goals

- [ ] Montar um álbum completo pela interface, sem tocar em código
- [ ] Editar sem degradar a virada nem perder o cursor
- [ ] Nunca perder trabalho: autosave com conflito explícito e desfazer confiável
- [ ] Zero mudança em `src/live-book/`

## Out of Scope

| Item | Motivo |
|---|---|
| Drag & drop de blocos dentro da página | layouts nomeados + setas cobrem 95% por 10% do esforço |
| Edição colaborativa | `rev` + aviso bastam |
| Edição de capa avançada | capa é `CoverSpec` de blocos; usa o mesmo inspector |
| Surfaces `journal` e `scan` | Fases 5 e 6 |
| Atalhos além de desfazer/refazer | não pedido |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Razão | Confirmado? |
|---|---|---|---|
| Layout do editor | livro real à esquerda, trilho de páginas à direita | o produto é "parece um livro"; editar em lista e pré-visualizar dobra o trabalho | s |
| Commit no documento | em blur, ou debounce de 600 ms | `surfaceCache` é invalidado por `faces`; commit por tecla custaria 8–20 ms cada | s |
| `contentEditable` | **não controlado**; só escreve `innerHTML` quando não está focado e o valor mudou | escrever durante a digitação reposiciona o cursor | s |
| Desfazer/refazer | pilhas de patches do immer, teto de 100 | preciso e barato; sem diff de árvore inteira | s |
| Seleção do editor | store separado do documento | senão cada clique entra no histórico de desfazer | s |
| Autosave | debounce de 1200 ms | payload de ~180 KB; mais frequente que isso é desperdício | s |
| Conflito de `rev` | trava o autosave e avisa; sem merge | merge silencioso perde trabalho sem o autor saber | s |
| Reordenar páginas | HTML5 drag and drop nativo | `dnd-kit` é dependência grande para um caso só | **n** |
| Inserir página | sempre no fim, e bloqueado durante virada | mudar a paridade recria os `MotionValue` e descarta animação em voo ([LiveBook.tsx:173](../../../src/live-book/LiveBook.tsx)) | s |

**Open question:** drag and drop nativo tem ergonomia ruim em touch. Se o autor for
reordenar pelo celular, precisa de alternativa — decidir com protótipo.

---

## Dimensões implícitas

| Dimensão | Cobertura |
|---|---|
| Validação e limites | limites de `src/config/limits.ts`; a UI avisa antes de o save ser recusado |
| Falha e falha parcial | falha de autosave preserva o estado local e sinaliza; nunca descarta em silêncio |
| Idempotência | desfazer aplicado duas vezes recua dois passos, sem estado inválido |
| Fronteiras de autorização | `canWrite = false` esconde o editor inteiro |
| Concorrência | duas abas: a segunda a salvar recebe conflito e trava |
| Ciclo de vida do dado | imagem removida vira asset órfão, coletado no save |
| Observabilidade | indicador de estado do save visível (salvando, salvo, conflito, offline) |
| Falha de dependência externa | offline mantém edição local e sinaliza que não está salvo |
| Integridade de transição | inserir/remover página não pode ocorrer durante virada |

---

## User Stories

### P1: Montar páginas com fotos e texto ⭐ MVP

**User Story**: Como autor, quero arrastar fotos e escrever texto direto nas páginas, para
montar o álbum sem escrever código.

**Acceptance Criteria**:

1. QUANDO fotos são arrastadas para o editor ENTÃO DEVEM ser processadas, enviadas e viradas páginas, com progresso visível
2. QUANDO um layout é escolhido para uma página ENTÃO os blocos DEVEM ser semeados conforme o layout da surface
3. QUANDO um bloco é selecionado ENTÃO o inspector DEVE mostrar seus campos editáveis
4. QUANDO um bloco de texto é editado e o foco sai ENTÃO a alteração DEVE ser aplicada ao documento
5. QUANDO uma foto tem ponto focal ajustado ENTÃO o recorte exibido DEVE mudar conforme o ajuste
6. QUANDO uma imagem é adicionada ENTÃO o editor DEVE pedir o texto alternativo, aceitando vazio como escolha explícita de imagem decorativa

---

### P1: Editar sem degradar a leitura ⭐ MVP

**User Story**: Como autor, quero que o editor continue fluido enquanto edito um volume
grande, porque a máquina alvo é fraca.

**Acceptance Criteria**:

1. QUANDO estou digitando num bloco de texto ENTÃO nenhuma alteração DEVE ser aplicada ao documento até blur ou 600 ms de pausa
2. QUANDO o autosave dispara durante a digitação ENTÃO o cursor NÃO DEVE ser reposicionado
3. QUANDO o foco está num bloco de texto e uma seta é pressionada ENTÃO a página NÃO DEVE virar
4. QUANDO uso a roda do mouse dentro do editor ENTÃO a página NÃO DEVE virar
5. QUANDO um volume de 60 páginas está aberto no editor ENTÃO trocar de página selecionada DEVE responder em menos de 100 ms

---

### P1: Não perder trabalho ⭐ MVP

**Acceptance Criteria**:

1. QUANDO uma alteração é feita ENTÃO o autosave DEVE ocorrer após 1200 ms de inatividade
2. QUANDO o save falha por conflito de `rev` ENTÃO o sistema DEVE avisar e **travar** o autosave, sem sobrescrever
3. QUANDO o save falha por rede ENTÃO o estado local DEVE ser preservado e o indicador DEVE mostrar "não salvo"
4. QUANDO desfazer é acionado ENTÃO o documento DEVE voltar exatamente ao estado anterior
5. QUANDO refazer é acionado após desfazer ENTÃO o documento DEVE voltar ao estado posterior
6. QUANDO uma nova alteração ocorre após desfazer ENTÃO a pilha de refazer DEVE ser descartada
7. QUANDO o autor tenta sair com alterações não salvas ENTÃO o sistema DEVE avisar

---

### P1: Organizar o volume ⭐ MVP

**Acceptance Criteria**:

1. QUANDO o trilho é aberto ENTÃO DEVE mostrar miniaturas de todas as páginas, na ordem
2. QUANDO uma página é arrastada no trilho ENTÃO a ordem no documento DEVE mudar conforme
3. QUANDO uma página é selecionada no trilho ENTÃO o livro DEVE navegar até ela
4. QUANDO uma página é removida ENTÃO a numeração das seguintes DEVE se ajustar
5. QUANDO "nova página" é acionado durante uma virada ENTÃO a ação DEVE estar bloqueada
6. QUANDO uma página é inserida ENTÃO DEVE entrar no fim do volume

---

### P2: Publicar e compartilhar

**Acceptance Criteria**:

1. QUANDO o autor pede o link de compartilhamento ENTÃO o sistema DEVE apresentá-lo pronto para copiar
2. QUANDO a visibilidade é alterada ENTÃO o efeito DEVE ser imediato no link público
3. QUANDO o volume é aberto pelo link público ENTÃO nenhum controle de edição DEVE existir no DOM

---

## Edge Cases

- QUANDO uma pasta com 200 fotos é solta ENTÃO o processamento DEVE ser cancelável e mostrar progresso
- QUANDO desfazer é acionado sobre uma alteração que envolveu upload ENTÃO o bloco DEVE sair da página, e o asset vira órfão coletado depois
- QUANDO o mesmo volume está aberto em duas abas ENTÃO a segunda a salvar DEVE receber conflito e travar
- QUANDO o documento se aproxima do limite de páginas ENTÃO o editor DEVE avisar antes da recusa do servidor
- QUANDO um bloco corrompido existe no documento ENTÃO o editor DEVE mostrar card de aviso, e o bloco DEVE permanecer no documento
- QUANDO o volume abre em somente-leitura (versão futura de schema) ENTÃO o editor DEVE estar desabilitado com explicação
- QUANDO o autor cola texto formatado ENTÃO a formatação DEVE ser normalizada para os blocos existentes

---

## Requirement Traceability

| ID | Story | Fase | Status |
|---|---|---|---|
| EDIT-01 | Montar — drop de fotos e progresso | — | Pending |
| EDIT-02 | Montar — layouts e inspector | — | Pending |
| EDIT-03 | Montar — texto alternativo e ponto focal | — | Pending |
| EDIT-04 | Fluidez — commit adiado e cursor estável | — | Pending |
| EDIT-05 | Fluidez — teclado e roda isolados do motor | — | Pending |
| EDIT-06 | Trabalho — autosave e conflito | — | Pending |
| EDIT-07 | Trabalho — desfazer e refazer | — | Pending |
| EDIT-08 | Organizar — trilho e reordenação | — | Pending |
| EDIT-09 | Organizar — inserir e remover páginas | — | Pending |
| EDIT-10 | Publicar — link e visibilidade | — | Pending |

---

## Success Criteria

- [ ] Um álbum de 10 páginas com fotos montado ponta a ponta sem tocar em código
- [ ] Digitar num bloco de texto não vira a página e não desloca o cursor
- [ ] Desfazer e refazer restauram estados exatos, verificados por teste
- [ ] Conflito entre duas abas é sinalizado, e nenhuma sobrescreve a outra
- [ ] `git diff --stat src/live-book/` vazio ao fim da fase
