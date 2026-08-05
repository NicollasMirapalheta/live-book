/**
 * Layouts do album (MEDIA-06 AC2/AC3). Cada layout e uma receita `seed()` de blocos
 * iniciais; `newAlbumPage` cria a pagina ja com o `layout` e o `hideNumber` que ele
 * implica. full-bleed suprime a numeracao (AC3) pelo campo `page.hideNumber`, que o
 * `renderPages` inalterado ja propaga ao `<Page>` — nenhum ramo album no renderer.
 *
 * T12: full-bleed, single, text. T13 acrescenta duo, grid, photo-text.
 */
import { createBlock, createPage } from "../../factory";
import type { Block, BookPage } from "../../schema";
import type { SurfaceLayout } from "../registry";
import { albumDuo, albumPhoto } from "./blocks";

export type AlbumLayoutId =
  | "full-bleed"
  | "single"
  | "text"
  | "duo"
  | "grid"
  | "photo-text";

/** asset vazio: preenchido pelo editor (Fase 4) ou pela rota de importacao. */
const NO_ASSET = { id: "" };

export function seedFor(id: AlbumLayoutId): Block[] {
  switch (id) {
    case "full-bleed":
      return [albumPhoto({ asset: NO_ASSET, full: true }) as unknown as Block];
    case "single":
      return [albumPhoto({ asset: NO_ASSET }) as unknown as Block];
    case "text":
      // reusa o bloco de nucleo `text` (sanitizado no carregamento — AD-024/AD-026).
      return [createBlock("text", { html: "" })];
    case "duo":
      return [albumDuo([{ asset: NO_ASSET }, { asset: NO_ASSET }]) as unknown as Block];
    case "grid":
      // reusa o bloco de nucleo `gallery` como base da grade (design).
      return [createBlock("gallery", { items: [], columns: 3 })];
    case "photo-text":
      return [
        albumPhoto({ asset: NO_ASSET }) as unknown as Block,
        createBlock("text", { html: "" }),
      ];
  }
}

/** Layouts que escondem a numeracao impressa (full-bleed sangra a pagina inteira). */
const SUPPRESS_NUMBER: Partial<Record<AlbumLayoutId, boolean>> = { "full-bleed": true };

const LABELS: Record<AlbumLayoutId, string> = {
  "full-bleed": "Foto sangrada",
  single: "Foto única",
  text: "Texto",
  duo: "Par de fotos",
  grid: "Grade",
  "photo-text": "Foto e texto",
};

export const ALBUM_LAYOUT_IDS: AlbumLayoutId[] = [
  "full-bleed",
  "single",
  "text",
  "duo",
  "grid",
  "photo-text",
];

export const albumLayouts: SurfaceLayout[] = ALBUM_LAYOUT_IDS.map((id) => ({
  id,
  label: LABELS[id],
  seed: () => seedFor(id),
}));

/** Cria uma pagina de album com o layout e o hideNumber implicados por ele. */
export function newAlbumPage(id: AlbumLayoutId): BookPage {
  return createPage({ layout: id, hideNumber: SUPPRESS_NUMBER[id], blocks: seedFor(id) });
}
