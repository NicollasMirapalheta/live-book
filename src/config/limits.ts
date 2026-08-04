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
