/**
 * Tradução URL ↔ motor para o leitor (LIB-01, `AD-010`/`AD-020`).
 *
 * A URL canônica é o NÚMERO IMPRESSO da página (`/b/:id/p/:n`) — é o que o leitor
 * vê; folha (`leaf`) é conceito interno do motor. Estas duas funções são a única
 * ponte, e TODA conversão passa por `src/book/units.ts` — nada de `ceil`/`+1` solto
 * aqui (é onde o bug histórico volta).
 *
 * Geometria do spread: a folha `L` mostra a face `2L-1` à esquerda (verso) e a face
 * `2L` à direita (recto). O número impresso canônico de uma folha é o do RECTO
 * (`pageNumberOfFace(2L)`), então uma folha ↔ um número, sem ambiguidade — página 1
 * é o recto da folha 1.
 */

import {
  asFace,
  asPageNumber,
  leafOfPageNumber,
  pageNumberOfFace,
  type LeafIndex,
  type PageNumber,
} from "../book/units";

const clampInt = (n: number, lo: number, hi: number): number =>
  Math.min(Math.max(Math.trunc(n), lo), hi);

/**
 * A folha que precisa estar virada para o número impresso `n` aparecer. `n` fora do
 * intervalo `[1, maxPage]` — ou não-numérico (capa) — é limitado à posição válida
 * mais próxima, sem erro (LIB-01 AC5 / edge case da capa).
 */
export function leafForPage(n: number, maxPage: number): LeafIndex {
  const hi = Math.max(maxPage, 1);
  const page = Number.isFinite(n) ? clampInt(n, 1, hi) : 1;
  return leafOfPageNumber(asPageNumber(page));
}

/**
 * O número impresso canônico (recto) da folha `leaf`. Folha de casca (capa/guarda,
 * sem recto numerado) e posições além do miolo caem na página válida mais próxima —
 * o resultado está sempre em `[1, maxPage]`.
 */
export function pageForLeaf(leaf: number, maxPage: number): PageNumber {
  const hi = Math.max(maxPage, 1);
  const recto = pageNumberOfFace(asFace(2 * leaf));
  const page = recto == null ? 1 : clampInt(recto, 1, hi);
  return asPageNumber(page);
}
