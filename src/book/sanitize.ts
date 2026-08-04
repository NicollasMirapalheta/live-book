/**
 * Sanitizacao de HTML autoral (DATA-09, `AD-024`).
 *
 * A partir da Fase 2 o documento vem da rede, entao o `html` dos blocos `text` e
 * `callout` precisa passar por um sanitizador antes de ir ao DOM. Roda na BORDA DE
 * RENDER (`loadForRender`, T3), NUNCA dentro do `StorageAdapter` — o adapter devolve
 * o documento fielmente armazenado, senao o round-trip fiel do contrato quebraria
 * (`AD-026`).
 *
 * Usa a configuracao padrao do DOMPurify: uma allowlist de formatacao ja auditada
 * que remove `<script>`, `<object>`, etc. e todos os atributos de evento (`on*`),
 * preservando marcacao de formatacao, `class` e `style`.
 *
 * Blocos de `type` desconhecido passam INTACTOS (invariante 7): sanitizar campos que
 * este cliente nao entende poderia destruir conteudo de um cliente futuro.
 */

import DOMPurify from "dompurify";
import type { Block, BookDoc, CoverSpec } from "./schema";

function sanitizeBlock(block: Block): Block {
  if (
    (block.type === "text" || block.type === "callout") &&
    typeof (block as { html?: unknown }).html === "string"
  ) {
    return { ...block, html: DOMPurify.sanitize((block as { html: string }).html) };
  }
  return block;
}

function sanitizeCover(cover: CoverSpec | undefined): CoverSpec | undefined {
  if (!cover) return cover;
  return { ...cover, blocks: cover.blocks.map(sanitizeBlock) };
}

/** Devolve uma copia do documento com o HTML de todo bloco `text`/`callout`
 * sanitizado, onde quer que apareca (paginas, capa, contracapa). Puro: nao muta a
 * entrada. */
export function sanitizeDoc(doc: BookDoc): BookDoc {
  return {
    ...doc,
    cover: sanitizeCover(doc.cover),
    backCover: sanitizeCover(doc.backCover),
    pages: doc.pages.map((page) => ({ ...page, blocks: page.blocks.map(sanitizeBlock) })),
  };
}
