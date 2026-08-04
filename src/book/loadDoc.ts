/**
 * Borda de carga para render (DATA-09 AC4, `AD-026`).
 *
 * Transforma o documento CRU devolvido pelo `StorageAdapter` no documento pronto
 * para renderizar, em dois passos e nesta ordem:
 *
 *   1. `migrateDoc` — leva qualquer versao conhecida ate a corrente; versao futura
 *      volta marcada `readOnly` (salvar destruiria campos desconhecidos).
 *   2. `sanitizeDoc` — remove `<script>` e atributos de evento do HTML autoral,
 *      ANTES do primeiro render.
 *
 * E o unico caminho documentado de carga (borda da 2B). Se um consumidor pular
 * `loadForRender` e mandar o doc cru ao render, HTML da rede vai ao DOM sem
 * sanitizacao = XSS armazenado — por isso esta funcao sai testada ja na 2A.
 */

import { migrateDoc } from "./migrate";
import { sanitizeDoc } from "./sanitize";
import type { BookDoc } from "./schema";

export interface LoadedForRender {
  doc: BookDoc;
  /** Documento veio de versao futura: abre travado para leitura (save desabilitado). */
  readOnly: boolean;
}

export function loadForRender(raw: unknown): LoadedForRender {
  const { doc, readOnly } = migrateDoc(raw);
  return { doc: sanitizeDoc(doc), readOnly };
}
