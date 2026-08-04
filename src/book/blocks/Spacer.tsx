import type { BlockRenderProps } from "../RenderCtx";
import type { SpacerBlock } from "../schema";

/**
 * Espaco vertical. `size` fixo (sm/md/lg) ou `fill`, que ocupa o espaco restante
 * da pagina e empurra o conteudo seguinte para baixo (o PageBody e coluna flex).
 */
export function Spacer({ block }: BlockRenderProps) {
  const b = block as SpacerBlock;
  const size = b.size ?? "md";
  return <div className={`bk-spacer bk-spacer--${size}`} aria-hidden="true" />;
}
