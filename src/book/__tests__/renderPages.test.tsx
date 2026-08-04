import { describe, it, expect } from "vitest";
import { Children, isValidElement } from "react";
import { renderPages, renderCover } from "../renderPages";
import { PageBody } from "../PageBody";
import { getSurface } from "../surfaces/registry";
import type { RenderCtx } from "../RenderCtx";
import type { BookDoc, BookPage } from "../schema";

const ctx: RenderCtx = {
  doc: { schemaVersion: 1, id: "d", title: "t", surface: "manuscript", pages: [] },
  surface: getSurface("manuscript"),
  mode: "read",
  assetUrl: (ref) => ref.id,
};

const doc = (pages: BookPage[]): BookDoc => ({
  schemaVersion: 1,
  id: "doc",
  title: "Volume",
  surface: "manuscript",
  pages,
});

const bigDoc = (n: number): BookDoc =>
  doc(
    Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      // muitos blocos por pagina: se renderPages construisse a arvore, apareceriam aqui
      blocks: Array.from({ length: 10 }, (_, j) => ({
        id: `b${i}-${j}`,
        type: "text" as const,
        html: `linha ${j}`,
      })),
      chapter: i % 5 === 0 ? `Cap ${i}` : undefined,
    })),
  );

describe("renderPages", () => {
  it("devolve exatamente um elemento por pagina, na ordem de doc.pages", () => {
    const pages = renderPages(
      doc([
        { id: "a", blocks: [] },
        { id: "b", blocks: [] },
        { id: "c", blocks: [] },
      ]),
      ctx,
    );
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.key)).toEqual(["a", "b", "c"]);
  });

  it("propaga chapter, title, tone e hideNumber para o <Page>", () => {
    const [page] = renderPages(
      doc([
        { id: "a", blocks: [], chapter: "01 · Cap", title: "Intro", tone: "chapter", hideNumber: true },
      ]),
      ctx,
    );
    expect(page.props.chapter).toBe("01 · Cap");
    expect(page.props.title).toBe("Intro");
    expect(page.props.tone).toBe("chapter");
    expect(page.props.hideNumber).toBe(true);
  });

  it("a key do elemento e o page.id", () => {
    const [page] = renderPages(doc([{ id: "id-estavel", blocks: [] }]), ctx);
    expect(page.key).toBe("id-estavel");
  });

  it("NAO constroi a arvore de blocos: cada elemento tem no maximo um filho (um PageBody)", () => {
    const pages = renderPages(bigDoc(300), ctx);
    expect(pages).toHaveLength(300);
    for (const page of pages) {
      expect(Children.count(page.props.children)).toBeLessThanOrEqual(1);
      const child = page.props.children;
      expect(isValidElement(child) && child.type === PageBody).toBe(true);
    }
  });

  it("performance: 300 paginas em menos de 5ms", () => {
    const d = bigDoc(300);
    renderPages(d, ctx); // aquece
    let best = Infinity;
    for (let i = 0; i < 5; i += 1) {
      const t0 = performance.now();
      renderPages(d, ctx);
      best = Math.min(best, performance.now() - t0);
    }
    expect(best).toBeLessThan(5);
  });

  it("e pura: duas chamadas com a mesma entrada dao saida estruturalmente identica", () => {
    const d = doc([
      { id: "a", blocks: [], chapter: "Cap", title: "T", tone: "accent" },
      { id: "b", blocks: [] },
    ]);
    const shape = (pages: ReturnType<typeof renderPages>) =>
      pages.map((p) => ({
        key: p.key,
        chapter: p.props.chapter,
        title: p.props.title,
        tone: p.props.tone,
        hideNumber: p.props.hideNumber,
      }));
    expect(shape(renderPages(d, ctx))).toEqual(shape(renderPages(d, ctx)));
  });

  it("borda: doc.pages vazio devolve array vazio", () => {
    expect(renderPages(doc([]), ctx)).toEqual([]);
  });
});

describe("renderCover", () => {
  it("devolve undefined quando nao ha CoverSpec", () => {
    expect(renderCover(undefined, ctx)).toBeUndefined();
  });

  it("devolve um elemento PageBody para um CoverSpec", () => {
    const node = renderCover({ blocks: [{ id: "c1", type: "heading", text: "Capa" }] }, ctx);
    expect(isValidElement(node) && node.type === PageBody).toBe(true);
  });
});
