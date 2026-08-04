import { blockTableFor } from "./surfaces/registry";
import { PageErrorBoundary } from "./PageErrorBoundary";
import type { RenderCtx } from "./RenderCtx";
import type { BookPage } from "./schema";

/**
 * Monta a arvore de blocos de UMA pagina — e so quando a folha entra na janela do
 * motor. renderPages devolve `<Page><PageBody/></Page>`; o PageBody so materializa
 * os blocos no render efetivo, o que preserva a virtualizacao (DOC-04).
 *
 * Cada bloco:
 *  - e resolvido pela tabela `nucleo ∪ surface.blocks` (memoizada por surface);
 *  - de `type` nao registrado, e PULADO no render mas permanece no documento (DOC-05 AC3);
 *  - e envolto num PageErrorBoundary proprio, entao se um bloco lança, os irmaos
 *    continuam no DOM e o volume segue navegavel (DOC-06);
 *  - usa `block.id` como key.
 */
export function PageBody({ page, ctx }: { page: BookPage; ctx: RenderCtx }) {
  const table = blockTableFor(ctx.surface.id);
  return (
    <div className="bk-page">
      {page.blocks.map((block) => {
        const Comp = table[block.type];
        if (!Comp) return null; // desconhecido: some da tela, sobrevive no documento
        return (
          <PageErrorBoundary key={block.id} label={`bloco ${block.type}#${block.id}`}>
            <Comp block={block} ctx={ctx} />
          </PageErrorBoundary>
        );
      })}
    </div>
  );
}
