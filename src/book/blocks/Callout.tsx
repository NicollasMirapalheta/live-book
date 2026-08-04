import type { BlockRenderProps } from "../RenderCtx";
import type { CalloutBlock } from "../schema";

/** Aviso em destaque. `tone` (padrao info) escolhe a cor; `icon` e um simbolo curto. */
export function Callout({ block }: BlockRenderProps) {
  const b = block as CalloutBlock;
  const tone = b.tone ?? "info";
  return (
    <aside className={`bk-callout bk-callout--${tone}`}>
      {b.icon ? <span className="bk-callout__icon" aria-hidden="true">{b.icon}</span> : null}
      <div className="bk-callout__body" dangerouslySetInnerHTML={{ __html: b.html }} />
    </aside>
  );
}
