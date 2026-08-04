import type { CSSProperties } from "react";
import type { BlockRenderProps } from "../RenderCtx";
import type { ImageBlock } from "../schema";

/**
 * Imagem unica. Emite `width`/`height` a partir do AssetRef para reservar a caixa
 * e evitar deslocamento de layout. Usa `loading="eager"` de proposito: `lazy` e
 * PROIBIDO (ADR-005) — a janela de virtualizacao do motor ja e o lazy loader, e
 * `lazy` dentro dela atrasaria a imagem da folha que acabou de entrar em cena.
 */
export function Image({ block, ctx }: BlockRenderProps) {
  const b = block as ImageBlock;
  const { w, h, lqip } = b.asset;
  const src = ctx.assetUrl(b.asset, "page");
  const frameStyle: CSSProperties | undefined = lqip
    ? { backgroundImage: `url(${lqip})` }
    : undefined;
  return (
    <figure className="bk-image">
      <span className="bk-image__frame" style={frameStyle}>
        <img
          className={`bk-image__img bk-image__img--${b.fit ?? "cover"}`}
          src={src}
          alt={b.alt ?? ""}
          width={w}
          height={h}
          loading="eager"
          decoding="async"
        />
      </span>
      {b.caption ? <figcaption className="bk-image__caption">{b.caption}</figcaption> : null}
    </figure>
  );
}
