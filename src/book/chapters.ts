/**
 * Slugs de capítulo (LIB-03).
 *
 * Mapa determinístico `slug → PageNumber` a partir das páginas que abrem capítulo
 * (`page.chapter`). O slug é estável por `slugify(label)`; em colisão, o PRIMEIRO
 * capítulo vence (edge case da spec) — a ordem do documento é a autoridade.
 *
 * O `PageNumber` de um capítulo é a posição 1-based da página no miolo (a página no
 * índice `i` do array imprime o número `i + 1`). `asPageNumber` (de `units.ts`) é a
 * única porta para tipar esse número — nenhuma conversão face/folha/número acontece
 * aqui fora de `units`.
 */

import type { BookDoc } from "./schema";
import { asPageNumber, type PageNumber } from "./units";

export interface ChapterSlug {
  slug: string;
  page: PageNumber;
  label: string;
}

/** Normaliza um rótulo em slug: sem acentos, minúsculo, `[^a-z0-9]` vira hífen, sem
 * hífens nas bordas. "01 · Começando" → "01-comecando". */
export function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lista os capítulos do documento como `{ slug, page, label }`, na ordem do
 * documento. Colisão de slug → o primeiro capítulo vence (descartamos os seguintes). */
export function chapterSlugs(doc: BookDoc): ChapterSlug[] {
  const seen = new Set<string>();
  const out: ChapterSlug[] = [];
  doc.pages.forEach((page, i) => {
    if (!page.chapter) return;
    const slug = slugify(page.chapter);
    if (seen.has(slug)) return; // primeiro vence — determinístico
    seen.add(slug);
    out.push({ slug, page: asPageNumber(i + 1), label: page.chapter });
  });
  return out;
}

/**
 * Resolve um slug para o `PageNumber` do capítulo. Slug inexistente cai na 1ª página
 * (`asPageNumber(1)`) — um link de capítulo quebrado abre o volume no começo, sem
 * erro (edge case da spec).
 */
export function resolveChapterPage(doc: BookDoc, slug: string): PageNumber {
  const match = chapterSlugs(doc).find((c) => c.slug === slug);
  return match ? match.page : asPageNumber(1);
}
