import type { CSSProperties } from "react";
import type { BlockRenderProps } from "../RenderCtx";
import type { GalleryBlock } from "../schema";

/** Grade de miniaturas. `columns` 2 ou 3 (padrao 2). Como Image, usa `eager`
 * (ADR-005) e reserva a caixa por item quando ha dimensoes. */
export function Gallery({ block, ctx }: BlockRenderProps) {
  const b = block as GalleryBlock;
  const columns = b.columns ?? 2;
  const style = { "--bk-cols": String(columns) } as CSSProperties;
  return (
    <div className={`bk-gallery bk-gallery--cols-${columns}`} style={style}>
      {b.items.map((item, i) => (
        <img
          key={i}
          className="bk-gallery__img"
          src={ctx.assetUrl(item.asset, "thumb")}
          alt={item.alt ?? ""}
          width={item.asset.w}
          height={item.asset.h}
          loading="eager"
          decoding="async"
        />
      ))}
    </div>
  );
}
