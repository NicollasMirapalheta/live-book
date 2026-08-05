/**
 * `collectAssetIds` — extrai os ids de asset referenciados por um `BookDoc`.
 *
 * Base da coleta de orfaos de `gcAssets` (AD-028): um asset e preservado se ESTE
 * doc — ou qualquer revisao retida — o referencia. Compartilhado por `LocalAdapter`
 * e `SupabaseAdapter` para que a regra de "o que conta como referenciado" seja UMA
 * so; divergir aqui apagaria imagem de versao restauravel num adapter e nao no outro.
 */

import type { BookDoc, GalleryBlock, ImageBlock, Block } from "../book/schema";

/** Todos os ids de asset citados por blocos de imagem/galeria do doc (capa, contracapa
 * e paginas). */
export function collectAssetIds(doc: BookDoc): Set<string> {
  const ids = new Set<string>();

  const scan = (blocks: Block[]): void => {
    for (const block of blocks) {
      if (block.type === "image") {
        const asset = (block as ImageBlock).asset;
        if (asset?.id) ids.add(asset.id);
      } else if (block.type === "gallery") {
        const items = (block as GalleryBlock).items;
        if (Array.isArray(items)) {
          for (const item of items) if (item.asset?.id) ids.add(item.asset.id);
        }
      }
    }
  };

  if (doc.cover) scan(doc.cover.blocks);
  if (doc.backCover) scan(doc.backCover.blocks);
  for (const page of doc.pages) scan(page.blocks);

  return ids;
}
