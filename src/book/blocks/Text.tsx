import type { BlockRenderProps } from "../RenderCtx";
import type { TextBlock } from "../schema";

/**
 * Paragrafo de HTML rico. Renderiza o campo `html` DIRETO, sem sanitizacao
 * (AD-024): na Fase 1 o conteudo e do proprio autor e vem de modulo local, entao
 * nao ha superficie de ataque. A sanitizacao vira obrigacao da Fase 2, quando o
 * documento passa a vir da rede — senao isto vira XSS armazenado.
 */
export function Text({ block }: BlockRenderProps) {
  const b = block as TextBlock;
  return <div className="bk-text" dangerouslySetInnerHTML={{ __html: b.html }} />;
}
