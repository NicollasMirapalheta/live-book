import type { BlockRenderProps } from "../RenderCtx";

/** Regua divisoria. Sem campos: e so um separador visual. */
export function Rule(_props: BlockRenderProps) {
  return <hr className="bk-rule" />;
}
