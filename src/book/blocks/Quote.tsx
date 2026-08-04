import type { BlockRenderProps } from "../RenderCtx";
import type { QuoteBlock } from "../schema";

/** Citacao em destaque, com autoria opcional. */
export function Quote({ block }: BlockRenderProps) {
  const b = block as QuoteBlock;
  return (
    <blockquote className="bk-quote">
      <p className="bk-quote__text">{b.text}</p>
      {b.cite ? <cite className="bk-quote__cite">{b.cite}</cite> : null}
    </blockquote>
  );
}
