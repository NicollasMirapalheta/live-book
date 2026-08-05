import type { CSSProperties } from "react";
import type { BlockRenderProps } from "../../../RenderCtx";
import type { AssetRef } from "../../../schema";

/**
 * Moldura de foto do album. Renderiza SO um `<img>` (nunca HTML da rede), entao nao
 * abre superficie de XSS — o texto do album vem do bloco de nucleo `text`, que passa
 * por `loadForRender` (AD-024/AD-026). Espelha o bloco `Image` do nucleo (reserva de
 * caixa por w/h, `lqip` como background, `loading="eager"` — ADR-005) e adiciona:
 *  - `full`: a foto sangra a pagina inteira (layout full-bleed, T12);
 *  - `frame` (T14): plain | polaroid | bleed | circle, molduras visualmente distintas.
 */

export type AlbumFrame = "plain" | "polaroid" | "bleed" | "circle";

/** Bloco exclusivo do album. Do ponto de vista do schema de nucleo e um bloco de
 * `type` desconhecido — seus campos sobrevivem ao round-trip (invariante 7). */
export interface AlbumPhotoBlock {
  id: string;
  type: "album-photo";
  asset: AssetRef;
  alt?: string;
  caption?: string;
  /** full-bleed: a foto ocupa a pagina inteira (T12). */
  full?: boolean;
  /** moldura ao redor da foto (T14); ausente = `plain`. */
  frame?: AlbumFrame;
}

export function AlbumPhoto({ block, ctx }: BlockRenderProps) {
  const b = block as unknown as AlbumPhotoBlock;
  const { w, h, lqip } = b.asset;
  const src = ctx.assetUrl(b.asset, "page");
  const frame: AlbumFrame = b.frame ?? "plain";
  const cls = [
    "bk-album-photo",
    `bk-album-photo--${frame}`,
    b.full ? "bk-album-photo--full" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const frameStyle: CSSProperties | undefined = lqip
    ? { backgroundImage: `url(${lqip})` }
    : undefined;
  return (
    <figure className={cls}>
      <span className="bk-album-photo__frame" style={frameStyle}>
        <img
          className="bk-album-photo__img"
          src={src}
          alt={b.alt ?? ""}
          width={w}
          height={h}
          loading="eager"
          decoding="async"
        />
      </span>
      {b.caption ? <figcaption className="bk-album-photo__caption">{b.caption}</figcaption> : null}
    </figure>
  );
}
