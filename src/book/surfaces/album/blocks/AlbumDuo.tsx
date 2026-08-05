import type { CSSProperties } from "react";
import type { BlockRenderProps } from "../../../RenderCtx";
import type { AssetRef } from "../../../schema";

/**
 * Duas fotos lado a lado (layout `duo`, T13). Como `album-photo`, renderiza SO
 * `<img>` (nunca HTML da rede) e usa `loading="eager"` (ADR-005), reservando a caixa
 * por foto quando ha dimensoes. Mostra no maximo dois itens — o par e o ponto do duo.
 */

export interface AlbumDuoItem {
  asset: AssetRef;
  alt?: string;
}

export interface AlbumDuoBlock {
  id: string;
  type: "album-duo";
  items: AlbumDuoItem[];
}

export function AlbumDuo({ block, ctx }: BlockRenderProps) {
  const b = block as unknown as AlbumDuoBlock;
  return (
    <div className="bk-album-duo">
      {b.items.slice(0, 2).map((item, i) => {
        const { w, h, lqip } = item.asset;
        const cellStyle: CSSProperties | undefined = lqip
          ? { backgroundImage: `url(${lqip})` }
          : undefined;
        return (
          <span key={i} className="bk-album-duo__cell" style={cellStyle}>
            <img
              className="bk-album-duo__img"
              src={ctx.assetUrl(item.asset, "page")}
              alt={item.alt ?? ""}
              width={w}
              height={h}
              loading="eager"
              decoding="async"
            />
          </span>
        );
      })}
    </div>
  );
}
