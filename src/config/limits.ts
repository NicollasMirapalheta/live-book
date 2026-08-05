/**
 * Limites de persistencia — fonte unica no cliente (dimensoes implicitas da spec
 * Fase 2A: "Validacao e limites").
 *
 * IMPORTANTE: estes valores sao ESPELHADOS LITERALMENTE no `save_book`/`create_book`
 * de `src/data/supabase/schema.sql`. Ao mudar aqui, mude tambem no SQL — o servidor
 * e a autoridade final, mas divergir silenciosamente deixa o cliente aceitar o que o
 * banco recusa (ou vice-versa).
 */

/** Teto de paginas de miolo por volume. Espelhado no SQL. */
export const MAX_PAGES = 400;

/** Teto de tamanho do documento serializado (JSON), em bytes = 4 MB. Espelhado no SQL. */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;

/** Revisoes restauraveis retidas por volume; as mais antigas sao podadas na propria
 * transacao de save (`AD-025`). Espelhado no SQL. */
export const REVISION_CAP = 20;

/** Teto de tamanho por objeto de asset (imagem) no bucket, em bytes = 2 MB
 * (`AD-028`). ESPELHADO no `schema.sql` (policy de upload no bucket `book-assets`):
 * ao mudar aqui, mude o literal la — o servidor e a autoridade final. */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

/** Teto de dimensao intrinseca aceita numa imagem (maior lado, em px). Acima disso
 * a imagem e recusada com `too-many-pixels` em vez de travar a maquina alvo (edge
 * case da spec da Fase 3). Verificado apos o decode, quando as dimensoes reais sao
 * conhecidas. */
export const MAX_IMAGE_DIMENSION = 8000;
