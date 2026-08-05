/**
 * Blocos exclusivos da surface album, somados ao nucleo por `blockTableFor`. Todos
 * renderizam so imagem (nunca HTML da rede): texto e grade vêm dos blocos de nucleo
 * `text`/`gallery`, que passam por `loadForRender` (AD-024/AD-026).
 */
import type { BlockTable } from "../../../RenderCtx";
import { AlbumPhoto, type AlbumFrame, type AlbumPhotoBlock } from "./AlbumPhoto";
import { AlbumDuo, type AlbumDuoBlock, type AlbumDuoItem } from "./AlbumDuo";

export const albumBlocks: BlockTable = {
  "album-photo": AlbumPhoto,
  "album-duo": AlbumDuo,
};

/** Constroi um bloco `album-photo` com id estavel. */
export function albumPhoto(props: Omit<AlbumPhotoBlock, "id" | "type">): AlbumPhotoBlock {
  return { id: crypto.randomUUID(), type: "album-photo", ...props };
}

/** Constroi um bloco `album-duo` com id estavel. */
export function albumDuo(items: AlbumDuoItem[]): AlbumDuoBlock {
  return { id: crypto.randomUUID(), type: "album-duo", items };
}

export type { AlbumFrame, AlbumPhotoBlock, AlbumDuoBlock, AlbumDuoItem };
