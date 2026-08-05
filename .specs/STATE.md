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
- **Status**: active; detalhado por AD-029 (mecanismo do reenquadramento).

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
- **Status**: active; paleta e "herói só no side menu" **superseded by AD-031** (identidade amadeirada + estante-herói na home). Princípios estruturais (escopo de token `--lb-*`/`--app-*`, Fraunces+Inter, sem novas deps, sem toggle claro/escuro) permanecem.

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
- **Status**: active; exceções aditivas pontuais: AD-005 (`stageOffset` retrato), AD-027 (`inert` de a11y em `Leaf.tsx`), AD-032 (reskin só-pele: cor/textura/tipografia via `--lb-*` e CSS não-geométrico).

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

### AD-028
- **Decision**: O upload de asset entra no contrato do `StorageAdapter` como método `uploadAsset(bookId, ProcessedImage): AssetRef`, implementado pelos três adapters e coberto pela suíte de contrato única (`adapter.contract.ts`); não vira serviço paralelo. `assetUrl(ref, size)` passa a honrar `size` pela convenção de path `.../{ref.id}/{size}`, e `gcAssets` deixa de ser no-op (coleta órfãos preservando o que qualquer revisão retida referencia, não só o doc atual).
- **Reason**: O 2A já deixou o gancho pronto (`gcAssets`/`assetUrl` com comentário "uploads são Fase 3") e o princípio Open Host Service exige que o resto do produto conheça só a interface. Um serviço à parte duplicaria a fronteira de autorização (`edit_token`, `AD-012`) e a suíte de contrato.
- **Trade-off**: `PublicAdapter.uploadAsset` precisa existir só para lançar `WriteForbiddenError`; o contrato cresce.
- **Scope**: `src/data/StorageAdapter.ts`, os 3 adapters, `adapter.contract.ts`, `src/data/supabase/schema.sql` (bucket policy + teto 2 MB), `src/config/limits.ts` (`MAX_ASSET_BYTES`).
- **Date**: 2026-08-05
- **Status**: active

### AD-029
- **Decision**: O modo retrato é um reenquadramento **estritamente aditivo** dentro do motor: um hook novo `usePortraitFrame` (arquivo novo em `src/live-book/`, fora da lista vigiada por `guard-engine.mjs`), disparado por `matchMedia("(max-aspect-ratio: 3/4)")`, que (1) põe `useStageScale` em modo página única (escala pela largura de UMA página), (2) soma um termo de enquadramento ao `stageX` para centralizar a metade esquerda/direita do spread, e (3) instala swipe no viewport que alterna o lado e, no limite, chama o `goTo` existente. `angles`, `faces`, `surfaceOf`, `surfaceCache`, `inWindow`, `toc` e a geometria de `live-book.css` **não** mudam.
- **Reason**: Detalha e confirma o `AD-005` ("reusa `stageOffset`"). Mantém a virada 3D intacta (`AD-022`) e o produto/rota ignorante da matemática de enquadramento (`AD-009`), pondo a lógica no contexto Reading, onde ela pertence. Validação em celular real fica como gate de aceite no fim do Execute (o gatilho 3/4 e o gesto não são decidíveis no papel).
- **Trade-off**: Encosta nos dois arquivos WARNED do motor (`useStageScale.ts`, `LiveBook.tsx`) — mas só de forma aditiva; a caracterização da Fase 0 (MEDIA-10 AC6) é a rede contra regressão.
- **Scope**: `src/live-book/usePortraitFrame.ts` (novo), edições aditivas em `useStageScale.ts` e no cálculo de `stageX` de `LiveBook.tsx`. Detalha `AD-005`.
- **Date**: 2026-08-05
- **Status**: active

### AD-030
- **Decision**: O projeto passa a ter uma **fase dedicada a Sistema de Design & UX** (nova Fase 4), posicionada **antes do editor** (que vira Fase 5). Ela define uma linguagem visual completa e um sistema de componentes documentados (fonte única em `docs/design/design-system.md` + tokens) e os **aplica em todas as telas existentes**; não é só polimento pontual. Renumera o roadmap: editor→5, journal→6, scan/pdf→7, auth→8.
- **Reason**: A postura anterior — design distribuído por fase, sem fase própria — acumulou dívida que só apareceu ao abrir o app na web (leitor espremido, rotas cruas; a `casca-visual-rotas` remediou o pior, mas de forma reativa). O produto tem como primeiro entregável um álbum-presente: "só funcionar" não basta, precisa de ótima UI/UX. Construir o editor (superfície de UI enorme) antes do sistema só criaria mais dívida para repolir; fazê-lo antes faz o editor nascer coerente. Decisão do autor (2026-08-05): fase agora, antes do editor, escopo sistema+aplicação.
- **Trade-off**: Adia o editor em uma fase. Qualidade visual é em parte subjetiva, então parte das ACs é checklist de design (web-design-guidelines) + UAT do autor, não teste automatizado — coerente com o fato de CSS/layout não renderizar em jsdom.
- **Scope**: `docs/design/design-system.md`, `src/ui/`, aplicação nas rotas e na surface `album`. Estende `AD-015` (não o substitui); respeita `AD-022` (motor intocado), `AD-005`/reduced-motion e o orçamento de performance da Fase 3. Sem modo escuro (fora de escopo do roadmap).
- **Date**: 2026-08-05
- **Status**: active

### AD-031
- **Decision**: A identidade visual do produto é **biblioteca amadeirada e aconchegante**, com "papel iluminado" agora **literal**: o ambiente (home, mesa de leitura) é madeira quente em penumbra; a página é a superfície clara e iluminada. A **home é uma estante frontal de verdade** — o usuário tira uma **lombada** (não um card). A **leitura** é o livro pousado numa **mesa amadeirada texturada** sob um poço de **luz de abajur** (fosco, sem verniz). A **magia é explícita porém morna** (livro que levita + faíscas âmbar), reservada a home/carregando/vazio, nunca durante a leitura. Acentos: **`--brasa`** (terracota — destaques/CTA) e **`--salvia`** (verde — foco/links/marca-página). Supersede a paleta e a regra "herói só no side menu" do `AD-015`; mantém os princípios estruturais do `AD-015`.
- **Reason**: Direção definida com o autor em 5 rodadas de exploração visual (artefatos). "Só funcionar" não bastava para o álbum-presente; a metáfora de biblioteca/aventura aconchegante dá alma ao produto. A paleta bege+lilás anterior não expressava isso.
- **Trade-off**: A "sala" passa a ser quente-escura (não bege claro), o que muda o cromo do produto; a fidelidade final de madeira/luz depende da implementação (textura leve bem escolhida + gradientes de luz), afinável depois sem retravar a direção.
- **Scope**: `docs/design/design-system.md` (reescrito), `src/ui/`, temas de surface, reskin do motor (`AD-032`).
- **Date**: 2026-08-05
- **Status**: active

### AD-032
- **Decision**: Exceção aditiva ao `AD-022`: a Fase 4 pode **retocar a aparência (a "pele") do motor** para entrar na nova identidade — cor e textura do papel, borda e sombra das folhas, tipografia de capítulo/número/capitular, fita de leitura, e o **fundo do palco (a mesa), a luz do abajur e a vinheta** — **exclusivamente** via custom properties `--lb-*` e CSS que **não é geometria**. Permanecem intocados (protegidos por `AD-022`): `Face`, `faces`, `surfaceOf`, `angles`, `surfaceCache`, `inWindow`, `toc`, `Leaf.tsx`, `constants.ts` e **a geometria de `live-book.css`** (dimensões, transformações, perspectiva, ângulos, timing da virada).
- **Reason**: O motor nunca teve design deliberado; para o produto ficar coeso, a pele precisa mudar. Mas a mecânica foi afinada por performance e é o ativo mais caro — o reskin não pode tocá-la. Autorizado explicitamente pelo autor.
- **Trade-off**: Encosta em `live-book.css`, o arquivo mais sensível; mitigado por limitar a mudança a propriedades de cor/textura/tipografia e à caracterização da Fase 0 como rede.
- **Scope**: `--lb-*` na borda do `LiveBook`, CSS não-geométrico de `live-book.css`/temas de surface. Análogo às exceções `AD-005`/`AD-027`.
- **Date**: 2026-08-05
- **Status**: active

### AD-033
- **Decision**: A home é uma **estante frontal reta**; a **largura da prateleira acompanha a quantidade de volumes** (folga curta + um slot pontilhado "＋" convidando ao próximo), crescendo até a largura total no **teto de ~50 volumes**. Acima disso, uma **vista de acervo** é expansão futura. O **corredor em perspectiva está fora de escopo** por ora.
- **Reason**: O autor cravou a estante frontal como identidade da biblioteca e recusou dedicar tempo ao corredor agora; a régua de largura evita a prateleira meio-vazia. ~50 é o que a frontal sustenta confortável sem virar catálogo.
- **Trade-off**: Coleções muito grandes ficam sem tratamento dedicado até a vista de acervo; aceito (o alvo atual são poucas dezenas de volumes). O teto ~50 vira limite de produto (a encodar em `src/config/limits.ts` na implementação).
- **Scope**: home/estante em `src/ui/` e `src/routes/ShelfRoute`; `docs/design/design-system.md`.
- **Date**: 2026-08-05
- **Status**: active

## Handoff

- **Feature**: **Fase 3 (imagens, surface `album`, modo retrato) — concluída e validada.** Fases 0, 1, 2A e 2B também prontas.
- **Phase / Task**: 3 T1–T19 executadas (Design + Tasks + Execute completos, 3 batches de sub-agente) + fix `9db36bc`. Verifier independente: **PASS** (11/11 ACs MEDIA-01..11, sensor 7/7, gate 316 verdes/2 skip). Relatório em `.specs/features/fase-3-imagens-retrato/validation.md`.
- **Completed**:
  - Fase 0/1/2A/2B: fundação de teste, `units.ts`, schema/renderPages, surface `manuscript`, camada `src/data/` (3 adapters + `schema.sql` + `sanitize`/`loadForRender`), rotas + biblioteca + `main.tsx`.
  - **Fase 3 — Pipeline de mídia** (`src/media/`): `validate` (magic bytes, HEIC recusado, teto 2 MB/8000 px, `MAX_ASSET_BYTES` em `limits.ts`), `exif` (orientação 1..8), `process`+`lqip` (variantes `page` 1100px webp ≤200 KB / `thumb` 320px / lqip ≤1 KB, seam `RasterEncoder` injetável), `pipeline`+`worker` (OffscreenCanvas + fallback main-thread). **lqip computado ANTES de transferir o bitmap ao worker** (fix `9db36bc`; detach só aparecia no navegador real).
  - **Fase 3 — Upload no contrato** (`AD-028`): `StorageAdapter.uploadAsset` + `assetUrl(ref,size)` honrando size + `gcAssets` real (preserva assets de qualquer revisão retida) nos 3 adapters; bloco de upload em `adapter.contract.ts`; `schema.sql` com policy de bucket + teto 2 MB. Helper `src/data/assetRefs.ts`. Local id = uuid; Supabase id = `{bookId}/{uuid}`.
  - **Fase 3 — Lote + import**: `src/ingest/uploadBatch.ts` (pipeline N+1, serial por arquivo, retomável, sem página parcial); `src/routes/ImportRoute.tsx` (drop → uploadBatch → anexa páginas → saveBook), registrada em `AppRouter`.
  - **Fase 3 — Surface `album`** (`src/book/surfaces/album/`): SurfaceDef (tema, `chrome.margin=tight`, `defaultWindowRadius=2`), 6 layouts (`full-bleed`/`single`/`duo`/`grid`/`photo-text`/`text`), 4 molduras (`plain`/`polaroid`/`bleed`/`circle`), `album.css`. Registrar é aditivo (MEDIA-06 AC5, provado); reusa blocos de núcleo `Image`/`Gallery`/`Text` (sanitizados por `loadForRender`). Import lateral em `main.tsx`.
  - **Fase 3 — Retrato** (`AD-029`/`AD-005`, estritamente aditivo): `useStageScale(ref,{portrait})` modo página única (≥320px em 390×844; off = byte-idêntico); `usePortraitFrame.ts` NOVO (matchMedia `(max-aspect-ratio: 3/4)`, `frameSide`, swipe alterna lado e vira no limite via `goTo`); wiring em `LiveBook.tsx` (`goToRef`, `frameX`, `x: stageXFramed`). `angles`/`faces`/`surfaceOf`/`surfaceCache`/`inWindow`/`toc`/geometria CSS/`constants.ts` intocados; caracterização Fase 0 verde.
  - **Fase 3 — Performance** (MEDIA-11): `shot.mjs` resolve browser pelo Playwright; `e2e/perf.spec.ts` + `playwright.config.ts` (mede FPS falha <30, conta faces falha >10) — **rodou em chromium real: 10 faces, ~57 FPS sob throttle 4×**. `@playwright/test` em devDeps; `e2e/**` fora do glob do Vitest.
- **Também concluído nesta sessão**: **feature `casca-visual-rotas`** (remedia lacuna da 2B — rotas sem CSS; leitor abria espremido). `src/ui/app-shell.css` novo + afordância de volume vazio no ReaderRoute; validado no navegador (PASS), 318 testes. Commits `6563f66`/`ec6a9fe`.
- **Decisão de roadmap `AD-030`**: entra uma **Fase 4 dedicada a Sistema de Design & UX** (antes do editor); o editor vira **Fase 5**, journal→6, scan→7, auth→8. Pasta do editor renomeada `fase-4-editor`→`fase-5-editor`. Roadmap e cabeçalho do editor atualizados.
- **Fase 4 — Design travado nesta sessão**: 5 rodadas de exploração visual (artefatos) → direção **biblioteca amadeirada/aconchegente** cravada. Registrados `AD-031` (identidade), `AD-032` (reskin só-pele do motor), `AD-033` (home = estante frontal, largura escala, teto ~50, corredor fora). **`docs/design/design-system.md` reescrito** para a nova direção (paleta madeira/papel/brasa/sálvia/âmbar, home-estante, leitura-mesa-abajur, magia livro-farol, movimento, a11y). Spec da Fase 4 atualizada (direção resolvida, out-of-scope).
- **In-progress**: **Fase 4 — Execute** (inline, com UAT por checkpoint, não batches). `tasks.md` escrito (15 tarefas/5 fases). **Feito e pushado (commits `0524e76`→`7fbbf5e`):** T1 tokens (`src/ui/tokens.css`), T2 componentes (`src/ui/components.css`), T3 `MAX_BOOKS=50`+gate, T4 estante de lombadas (`Shelf`/`ShelfCard` reescritos, `ui.css`), T5 balão+estante maior/centralizada (feedback UAT), T6 estados+magia (`src/ui/Magic.tsx`+`magic.css`), T7 reskin da mesa amadeirada (`live-book.css` só-pele + tema manuscript quente, `AD-032`, Fase 0 verde). 320 testes verdes.
- **Next step**: continuar a Fase 4 — **T8** (reskin da folha: papel fosco, capítulo/capitular/número, fita sálvia, guardas ainda lilás em `live-book.css` linhas ~502/506/562/572), **T9** (surface `album` visual), depois Fase 4 (cascas T10/T11, magia no leitor T12) e Fase 5 (responsivo/a11y/não-regressão T13-15). Verificação por preview + UAT do autor. Depois, **Fase 5 do roadmap (editor)**.
- **Gates diferidos da Fase 3** (não bloqueiam a 4, mas pendentes antes de "entregar o presente"): (1) validar gatilho `3/4` + gesto de swipe em **celular real** (`AD-029`); (2) rodar `npx playwright test` num ambiente com Chromium no CI. (3) SPEC_DEVIATION a apertar quando Auth entrar: upload autorizado por uuid-segredo (`AD-013`) em vez de `edit_token`, marcado em `schema.sql`.
- **Ponto de atenção herdado**: app roda por `pickAdapter()` — com `.env` usa Supabase (precisa criar bucket/policy do `schema.sql` novo no projeto ao ir ao vivo com upload), sem env cai no Local com demo semeado. Cache de object URLs do LocalAdapter é em memória (some no reload) — só importa ao renderizar blobs locais após reload; hidratar em `getBook` fica deferido.
- **Config de ambiente**: `.env` local (gitignored) com URL + Publishable key do projeto `ahaortvxhhhvmxtdbsta`; `schema.sql` da 2A já aplicado — **a adição de upload/policy da Fase 3 ainda precisa ser aplicada no projeto** antes do upload ao vivo.
- **Uncommitted files**: `.specs/features/fase-3-imagens-retrato/{design.md,validation.md}` e edições de status em `spec.md`/`tasks.md`/`STATE.md` seguem **untracked/uncommitted** (fundação untracked em `main`, por convenção). Todo o código da Fase 3 está commitado.
- **Branch**: `claude/implantacao-proximos-passos-6b0ac3`. Range da Fase 3: `207e039..HEAD` (23 commits + fix). A fundação (specs/docs/CLAUDE.md/scripts/skills) continua **untracked em `main`**.
