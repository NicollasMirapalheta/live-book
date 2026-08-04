import type { BlockRenderProps } from "../RenderCtx";
import type { HeadingBlock } from "../schema";

/** Titulo de secao. `level` 1-3 (padrao 2) escolhe a tag; `align` alinha o texto. */
export function Heading({ block }: BlockRenderProps) {
  const b = block as HeadingBlock;
  const level = b.level ?? 2;
  const Tag = (["h1", "h2", "h3"] as const)[level - 1];
  return (
    <Tag
      className={`bk-heading bk-heading--${level}`}
      style={b.align ? { textAlign: b.align } : undefined}
    >
      {b.text}
    </Tag>
  );
}
