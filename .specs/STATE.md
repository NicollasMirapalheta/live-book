# STATE

Memória de projeto do Live Book. `## Decisions` é append-only (nunca editar entradas
antigas, só marcar `superseded by`). `## Handoff` é sobrescrito a cada pausa.

## Decisions

### AD-001
- **Decision**: Backend em Supabase (Postgres + Storage + Auth) como fornecedor único.
- **Reason**: Cobre banco, arquivos e autenticação futura no mesmo SDK client-side, e a RLS já modela `owner_id` para quando entrar login sem trocar de stack.
- **Trade-off**: Projeto no plano free pausa após ~1 semana sem acesso; primeiro request acorda em segundos.
- **Scope**: toda a camada de dados (`src/data/`).
- **Date**: 2026-08-03
- **Status**: active

### AD-002
- **Decision**: Conteúdo é criado por editor visual dentro do app, não por arquivos no repositório.
- **Reason**: Requisito explícito de não mover arquivos à mão; é também a base que serve diário e import de PDF.
- **Trade-off**: Custa uma fase inteira antes do primeiro livro real ficar pronto.
- **Scope**: `src/editor/`, rota `/b/:id/edit`.
- **Date**: 2026-08-03
- **Status**: active

### AD-003
- **Decision**: Biblioteca tem duas formas — estante em página própria (home) e side menu de troca rápida dentro do leitor.
- **Reason**: A estante escala para dezenas de volumes e serve de home; o side menu resolve alternar sem sair da leitura.
- **Trade-off**: Duas superfícies de navegação para manter em sincronia.
- **Scope**: `src/routes/ShelfRoute`, `src/ui/SideMenu`.
- **Date**: 2026-08-03
- **Status**: active

### AD-004
- **Decision**: Ordem de entrega começa pelo livro de fotos (surface `album`).
- **Reason**: É o que tem prazo real e o que exercita a parte mais difícil (upload, storage, layouts mistos, editor). As demais surfaces reaproveitam quase tudo.
- **Trade-off**: Diário e import de PDF ficam para depois.
- **Scope**: roadmap de fases.
- **Date**: 2026-08-03
- **Status**: active

### AD-005
- **Decision**: No celular o livro mantém a virada 3D, enquadrando uma página por vez; não haverá leitor vertical alternativo.
- **Reason**: A virada é o produto — um scroll vertical no celular entrega justamente o que torna o artefato especial. O reenquadramento reusa `stageOffset`, que já translada o palco.
- **Trade-off**: É o único lugar onde mexemos na geometria do motor recém-otimizado; risco de regressão maior que as demais mudanças.
- **Scope**: `useStageScale.ts`, `stageOffset` em `LiveBook.tsx`.
- **Date**: 2026-08-03
- **Status**: active

### AD-006
- **Decision**: O único eixo de variação armazenado no volume é `surface` (apresentação). Ingestores são um catálogo separado, e a origem das páginas fica como `provenance` (histórico, não restrição).
- **Reason**: Origem como tipo engessa o volume — um diário nasceria "de escrita" e nunca aceitaria fotos. Com este modelo, "PDF apresentado como álbum" e "diário com fotos" saem sem código novo.
- **Trade-off**: Não dá para consultar "todos os livros de PDF" por um campo direto; precisa olhar `provenance`.
- **Scope**: `src/book/schema.ts`, registry, `src/ingest/`.
- **Date**: 2026-08-03
- **Status**: active

### AD-007
- **Decision**: A v1 tem duas surfaces: `album` e `manuscript`. `journal` e `scan` entram depois.
- **Reason**: `album` é o livro-presente; `manuscript` é o que o demo atual já é, então sai quase de graça e serve de referência para as outras.
- **Trade-off**: Diário e import de PDF ficam bloqueados até a surface deles existir.
- **Scope**: `src/book/surfaces/`.
- **Date**: 2026-08-03
- **Status**: active

### AD-008
- **Decision**: A ponte documento → páginas é a função pura `renderPages(doc, ctx)`, nunca um componente.
- **Reason**: `LiveBook` lê `props.chapter`/`title`/`tone`/`hideNumber` direto dos filhos (`LiveBook.tsx:146`, `:229`, `:79`). Um componente wrapper viraria uma única face e mataria sumário, numeração e paginação.
- **Trade-off**: Nenhum relevante; a função ainda é memoizável e testável sem DOM.
- **Scope**: `src/book/renderPages.tsx`.
- **Date**: 2026-08-03
- **Status**: active

### AD-009
- **Decision**: `LiveBook` não recebe prop `doc` e nunca conhece documento, bloco, surface ou ingestor.
- **Reason**: Manter o contexto Reading independente de Composition. Caso contrário cada surface nova vira um `if` dentro do motor.
- **Trade-off**: Tema e configurações precisam ser traduzidos para props/CSS vars na borda.
- **Scope**: `src/live-book/` (contexto Reading).
- **Date**: 2026-08-03
- **Status**: active

### AD-010
- **Decision**: `FaceIndex`, `LeafIndex` e `PageNumber` são branded types distintos; conversões só por funções nomeadas.
- **Reason**: "Página" significa quatro coisas neste código e a confusão entre elas já causou o bug da v1 (capítulos um spread adiante, corrigido com `Math.ceil(f/2)`). Entram cinco novos pontos de conversão (rotas, sumário, trilho, import, side menu).
- **Trade-off**: Ruído de casts na fronteira; custo zero em runtime.
- **Scope**: `src/book/units.ts` e todo consumidor de navegação.
- **Date**: 2026-08-03
- **Status**: active

### AD-011
- **Decision**: O documento é persistido como uma coluna `jsonb` única, não em tabela de páginas normalizada.
- **Reason**: Save atômico, um round-trip, zero joins. Um álbum de 300 páginas fica em ~180 KB porque guarda só referências de asset.
- **Trade-off**: Documento inteiro trafega a cada save. Gatilho de migração definido: `pg_column_size(doc) > 1 MB` ou autosave acima de 400 ms.
- **Scope**: `books.doc`, `SupabaseAdapter`.
- **Date**: 2026-08-03
- **Status**: active

### AD-012
- **Decision**: Escrita sem login é autorizada por `edit_token` via RPC `security definer`, não por policy RLS permissiva.
- **Reason**: Uma policy do tipo "anon atualiza onde `owner_id is null`" deixa qualquer um que descubra o id editar o livro.
- **Trade-off**: Lógica de autorização mora em função SQL, não em policy declarativa.
- **Scope**: `create_book`, `save_book`, `claim_book`.
- **Date**: 2026-08-03
- **Status**: active

### AD-013
- **Decision**: Bucket de assets é público para leitura, com paths uuid, e `assetUrl()` é síncrono.
- **Reason**: URL assinada é assíncrona e expira, o que quebraria o caminho de render das folhas e o `surfaceCache`. O segredo é o uuid do path.
- **Trade-off**: Quem descobrir uma URL consegue lê-la. Aceito no estágio sem login; documentado em `SECURITY.md`.
- **Scope**: bucket `book-assets`, `StorageAdapter.assetUrl`.
- **Date**: 2026-08-03
- **Status**: active

### AD-014
- **Decision**: Variante `page` das imagens é 1100 px no maior lado, e surfaces com imagem usam `windowRadius = 2`.
- **Reason**: A página tem 560×760 CSS px e o palco só encolhe, então em DPR 2 o teto real é 1120×1520 — 1600 px queimaria 45% mais VRAM sem ganho visível. Com raio 2 são 10 faces montadas (~36 MB) em vez de 18 (~138 MB).
- **Trade-off**: Foto full-bleed pode granular em monitor 4K.
- **Scope**: `src/media/`, `defaultWindowRadius` das surfaces.
- **Date**: 2026-08-03
- **Status**: active

### AD-015
- **Decision**: Sistema visual editorial/papelaria reusando as custom properties `--lb-*` e as fontes já carregadas (Fraunces + Inter), com a pilha de lombadas 3D como elemento-herói apenas no side menu.
- **Reason**: Escala para dezenas de volumes, não duplica paleta, e preserva o momento tátil onde ele rende sem pintar madeira em tela cheia.
- **Trade-off**: Home tem menos impacto no primeiro segundo que uma estante skeuomórfica.
- **Scope**: `src/ui/`, `docs/design/design-system.md`.
- **Date**: 2026-08-03
- **Status**: active

### AD-016
- **Decision**: Testes derivam de critérios de aceite da spec e o gate vale desde a primeira fase, com verificador independente e commit atômico por tarefa.
- **Reason**: O projeto pretende virar produto pago; adiar teste até a fase de PDF deixaria o núcleo (schema, conversão de unidades, adapter) sem rede de segurança justamente onde os bugs são caros.
- **Trade-off**: Mais lento por tarefa. Supersede o plano original, que adiava testes.
- **Scope**: todo o projeto.
- **Date**: 2026-08-03
- **Status**: active

### AD-017
- **Decision**: `edit_token` tem caminho de recuperação fora do browser (link de resgate exibido uma vez na criação, para o autor guardar).
- **Reason**: Só em `localStorage`, limpar o browser apaga permanentemente a permissão de editar o livro-presente.
- **Trade-off**: Um passo a mais no fluxo de criação.
- **Scope**: `NewBookRoute`, `src/data/editTokens.ts`.
- **Date**: 2026-08-03
- **Status**: active

### AD-018
- **Decision**: Cada save grava uma revisão em tabela append-only, com as últimas N versões restauráveis.
- **Reason**: `save_book` sobrescreve; um bug no editor apagaria semanas de diagramação sem recuperação.
- **Trade-off**: Consumo de armazenamento proporcional ao número de saves; mitigado pelo teto N.
- **Scope**: tabela `book_revisions`, `save_book`.
- **Date**: 2026-08-03
- **Status**: active

### AD-019
- **Decision**: Acessibilidade é critério de aceite verificável nas specs, não item de backlog.
- **Reason**: Já existe defeito conhecido — botões focáveis dentro de subárvore `aria-hidden` (`LiveBook.tsx:651`) e ordem de foco que não acompanha o spread. Sem virar critério, nunca é feito.
- **Trade-off**: Amplia o escopo de cada fase.
- **Scope**: todas as specs; `docs/testing/strategy.md`.
- **Date**: 2026-08-03
- **Status**: active

### AD-020
- **Decision**: Roteamento com `react-router-dom` v6, e a URL canônica do leitor é o número impresso da página.
- **Reason**: Precisamos de `useSearchParams`, controle de history e guards de auth depois. O backlog do autor já pedia rota por capítulo.
- **Trade-off**: ~12 KB gz. Sincronizar URL e `leaf` exige sempre `replace`, senão folhear enterra o botão voltar.
- **Scope**: `src/routes/`.
- **Date**: 2026-08-03
- **Status**: active

### AD-021
- **Decision**: Import de PDF rasteriza cada página como imagem; texto é extraído apenas para busca e sumário, nunca refluído.
- **Reason**: Fidelidade de diagramação é o motivo de importar um PDF. Refluxo perde fontes, colunas e figuras.
- **Trade-off**: Páginas de PDF não são editáveis como texto nem selecionáveis.
- **Scope**: surface `scan`, ingestor `pdf`.
- **Date**: 2026-08-03
- **Status**: active

### AD-022
- **Decision**: São intocáveis sem decisão explícita que supersede esta: `Face`, `surfaceOf`, `faces`, `toc`, `inWindow`, `surfaceCache`, `angles`, `Leaf.tsx`, `constants.ts` e a geometria de `live-book.css`.
- **Reason**: Foram afinados no commit de performance (300 páginas de ~3 para ~37 FPS sob throttle 4x). Regressão ali é cara de diagnosticar e vale mais que qualquer feature do roadmap.
- **Trade-off**: Algumas features ficam mais trabalhosas por não poderem alterar o motor. Exceção única e já aprovada: AD-005.
- **Scope**: `src/live-book/`.
- **Date**: 2026-08-03
- **Status**: active; exceções aditivas pontuais: AD-005 (`stageOffset` retrato), AD-027 (`inert` de a11y em `Leaf.tsx`).

### AD-023
- **Decision**: A surface `album` sai da Fase 1 e passa para a Fase 3, junto do pipeline de mídia. A Fase 1 entrega apenas `manuscript`.
- **Reason**: `album` existe para apresentar fotos, e não há como colocar foto num volume antes do pipeline de imagem. Projetar tema, layouts e molduras sem nunca ver uma foto real dentro deles é construir às cegas.
- **Trade-off**: A Fase 1 entrega uma surface só, então o registry fica exercitado por um único caso — menos prova de que a abstração generaliza.
- **Scope**: roadmap; `.specs/features/fase-1-documento-renderer/`; `docs/roadmap.md`.
- **Date**: 2026-08-03
- **Status**: active

### AD-024
- **Decision**: O bloco `text` renderiza o campo `html` diretamente, sem sanitização, enquanto o documento vier de módulo local. Sanitizar vira obrigação da Fase 2.
- **Reason**: Na Fase 1 o conteúdo é escrito pelo próprio autor em TypeScript versionado; não há superfície de ataque. Adicionar sanitizador agora seria dependência sem ameaça correspondente.
- **Trade-off**: Cria uma dívida com data marcada. Se a Fase 2 esquecer, o app passa a renderizar HTML vindo da rede sem tratamento — que é XSS armazenado.
- **Scope**: `src/book/blocks/Text.tsx`; obrigação de entrada da Fase 2.
- **Date**: 2026-08-03
- **Status**: active

### AD-025
- **Decision**: O teto de revisões restauráveis por volume é 20, definido em `src/config/limits.ts` (`REVISION_CAP`) e espelhado literalmente no `save_book`.
- **Reason**: Fecha a *open question* da spec da Fase 2A. Um álbum de 300 páginas fica em ~180 KB; 20 revisões são ~3,6 MB por volume, e ~130 álbuns cheios cabem no plano free de 500 MB só de histórico. Equilíbrio entre durabilidade e custo previsível.
- **Trade-off**: O autor que voltar semanas depois só tem as últimas 20 versões; as anteriores foram podadas na própria transação de save.
- **Scope**: `src/config/limits.ts`, `book_revisions`, `save_book`. Confirma o `N` de `AD-018`.
- **Date**: 2026-08-04
- **Status**: active

### AD-026
- **Decision**: A sanitização de HTML roda na borda de render (`loadForRender` = `migrateDoc` → `sanitizeDoc`), nunca dentro do `StorageAdapter`. `getBook` devolve o documento fielmente armazenado.
- **Reason**: O contrato exige round-trip sem perda ("getBook devolve o documento salvo, sem perda"). Sanitizar dentro do adapter faria um doc com `<script>` voltar diferente do salvo e quebraria a fidelidade. Sanitizar no carregamento-para-render satisfaz `AD-024`/DATA-09 sem sujar o adapter.
- **Trade-off**: A obrigação de chamar `loadForRender` no caminho de carga vira responsabilidade do consumidor (rotas da 2B). Se a 2B esquecer, doc da rede chega ao render sem sanitizar — por isso `sanitizeDoc`/`loadForRender` já saem testados na 2A e a 2B tem essa chamada como critério de entrada.
- **Scope**: `src/book/sanitize.ts`, `src/book/loadDoc.ts`; caminho de carga da Fase 2B.
- **Date**: 2026-08-04
- **Status**: active

### AD-027
- **Decision**: Abre uma exceção aditiva pontual ao `AD-022`: é permitido adicionar em `Leaf.tsx` o atributo `inert` às folhas montadas que **não** são o spread atual, para a correção de acessibilidade da Fase 2B (LIB-07). A condição "é folha do spread" é derivada das props já existentes (`curlNext || curlPrev || coverNext || coverPrev`); nenhuma outra mudança em `Leaf.tsx` é autorizada, e o restante do `AD-022` segue ativo.
- **Reason**: O goal "leitor inteiramente navegável por teclado" exige que folhas ocluídas mas montadas saiam do tab order. A face virada já sai via `visibility:hidden`, mas a face visível-porém-ocluída das folhas adjacentes ao spread não — o Tab cai em conteúdo invisível. `inert` é o mecanismo correto, e a informação necessária já está nas props, então a mudança é aditiva e não toca geometria, ângulos, `faces`, `angles` nem `surfaceCache`.
- **Trade-off**: Encosta no arquivo mais protegido do motor (afinado por performance). Mitigado: derivado de props que já mudam a cada virada (sem re-render novo, sem `MotionValue` novo), e a caracterização da Fase 0 (LIB-07 AC6) é a rede — qualquer regressão estrutural quebra teste.
- **Scope**: `src/live-book/Leaf.tsx` (só o atributo `inert` derivado); LIB-07.
- **Date**: 2026-08-04
- **Status**: active

## Handoff

- **Feature**: Fase 2B (rotas e biblioteca) — **concluída e validada**. Fases 0, 1 e 2A também prontas.
- **Phase / Task**: 2B T1–T15 executadas (Design + Tasks + Execute completos). Verifier: PASS, sensor 6/6. Specify pronta para 3 e 4; Design/Tasks dessas pendentes.
- **Completed**:
  - Fase 0/1: fundação de teste, `units.ts`, schema/migrate/factory/renderPages, surface `manuscript`, `demoDoc`.
  - **Fase 2A**: camada `src/data/` — `StorageAdapter` + contrato nos 3 adapters (Local/IndexedDB, Public read-only, Supabase); `schema.sql` (JSONB + `book_revisions` poda 20, RLS, 6 RPCs `security definer`, view `books_public`); `sanitize.ts`+`loadForRender`; `editTokens.ts`; `pickAdapter()`; `check-rls.mjs`. Ao vivo: contrato 16/16, `check-rls` 6/6.
  - **Fase 2B**: `src/routes/` (AppRouter + ReaderRoute/ReaderShell traduzindo URL↔motor por `units.ts` + `onLeafChange`/`apiRef`, ShareRoute público, ShelfRoute, NewBookRoute com link de resgate, NotFoundRoute, AdapterContext, readerUrl), `src/book/chapters.ts`, `src/ui/` (Shelf/ShelfCard/SideMenu + `ui.css` visual, `AD-015`). **`main.tsx` liga tudo** (BrowserRouter + AdapterProvider(pickAdapter) + seed demo offline); `App.tsx` virou só harness do teste de integração da Fase 1. A11y do motor: `lb-tabs` fora do `aria-hidden`, `inert` nas folhas fora do spread (`AD-027`, `Leaf.tsx`), foco reancorado na virada, `a11y.css` (foco/44px). **Dívida `AD-026` paga** (`loadForRender` no ReaderRoute).
  - **Verificação 2B**: offline 218 testes verdes + 2 skip; typecheck/build verdes; caracterização da Fase 0 intacta (LIB-07 AC6). Preview (LocalAdapter): estante por `BookSummary` → leitor pelas rotas → virar atualiza URL (`/p/1`, `replace`) → voltar retorna à estante → foco do cartão visível (3px accent). Verifier: PASS, sensor 6/6, relatório em `.specs/features/fase-2b-rotas-biblioteca/validation.md`.
- **In-progress**: nada.
- **Next step**: **Fase 3** (imagens, surface `album`, modo retrato — `.specs/features/fase-3-imagens-retrato/spec.md`). É a fase de maior risco: mexe na geometria do motor (`AD-005`, retrato no celular) e no consumo de VRAM (`AD-014`). Precisa de Design + Tasks antes do Execute. Depende do pipeline de mídia e de upload (Storage do Supabase). Alternativa: **Fase 4** (editor) exige a 3 antes.
- **Ponto de atenção herdado**: o app roda por `pickAdapter()`; com `.env` presente usa Supabase (biblioteca do autor vazia agora), sem env cai no Local com o demo semeado. A rota `/s/:token` usa `token` = id do volume (o uuid é o segredo, `AD-004/013`).
- **Bugs pegos só na verificação ao vivo/preview** (corrigidos): 2A — `list_revisions` ambiguidade de coluna, `getBook` com id não-UUID. 2B — `inert` via `setAttribute` (jsdom não reflete a propriedade IDL); `:focus-visible` do produto estava só em `.lb-root` (faltava cobrir a estante).
- **Config de ambiente**: `.env` local (gitignored) com URL + Publishable key do projeto `ahaortvxhhhvmxtdbsta`; `schema.sql` já **aplicado** no projeto.
- **Uncommitted files**: nenhum — tudo commitado.
- **Branch**: `claude/implantacao-proximos-passos-6b0ac3`. A fundação (specs/docs/CLAUDE.md/scripts/skills) continua **untracked em `main`**.
