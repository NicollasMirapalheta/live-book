import type { ReactElement, ReactNode } from "react";
import { Page } from "../live-book";
import type { PageProps } from "../live-book";
import { PageBody } from "./PageBody";
import type { RenderCtx } from "./RenderCtx";
import type { BookDoc, CoverSpec } from "./schema";

/**
 * Traduz um documento em paginas do motor (DOC-03/DOC-04, ADR-002).
 *
 * Funcao PURA: sem I/O, sem hooks, sem estado de modulo. Devolve elementos RASOS
 * — cada `<Page>` recebe um unico filho, o ELEMENTO `<PageBody>`, que so materializa
 * a arvore de blocos quando o motor efetivamente monta a folha (dentro da janela de
 * virtualizacao). Construir os blocos aqui mataria a virtualizacao em 300 paginas.
 *
 * O motor le `chapter`, `title`, `tone` e `hideNumber` das props do `<Page>` por
 * introspeccao (por isso emitimos o componente real, nao um equivalente).
 */
export function renderPages(doc: BookDoc, ctx: RenderCtx): ReactElement<PageProps>[] {
  return doc.pages.map((page) => (
    <Page
      key={page.id}
      chapter={page.chapter}
      title={page.title}
      tone={page.tone}
      hideNumber={page.hideNumber}
    >
      <PageBody page={page} ctx={ctx} />
    </Page>
  ));
}

/**
 * Renderiza a capa/contracapa a partir de um CoverSpec, para as props `cover`/
 * `backCover` do motor. A casca esta sempre montada (leaf 0 e o ultimo leaf), entao
 * aqui construir a arvore de blocos e aceitavel — nao ha virtualizacao a preservar.
 */
export function renderCover(spec: CoverSpec | undefined, ctx: RenderCtx): ReactNode {
  if (!spec) return undefined;
  return <PageBody page={{ id: "cover", blocks: spec.blocks }} ctx={ctx} />;
}
