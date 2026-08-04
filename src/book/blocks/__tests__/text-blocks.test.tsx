import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { Heading } from "../Heading";
import { Text } from "../Text";
import { Quote } from "../Quote";
import type { RenderCtx } from "../../RenderCtx";
import type { Block } from "../../schema";

// ctx minimo: os blocos de texto nao usam assetUrl.
const ctx = { assetUrl: (r: { id: string }) => r.id } as unknown as RenderCtx;
const draw = (el: ReactElement) => render(el);
const withBlock = (Comp: (p: { block: Block; ctx: RenderCtx }) => ReactElement | null, block: Block) =>
  draw(<Comp block={block} ctx={ctx} />);

describe("Heading", () => {
  it("respeita level e renderiza a tag correspondente", () => {
    const { container } = withBlock(Heading, { id: "h1", type: "heading", text: "Titulo", level: 1 });
    expect(container.querySelector("h1")).not.toBeNull();
    expect(screen.getByText("Titulo")).toBeInTheDocument();
  });

  it("nivel ausente vira h2, e align vira text-align", () => {
    const { container } = withBlock(Heading, {
      id: "h2",
      type: "heading",
      text: "Meio",
      align: "center",
    });
    const el = container.querySelector("h2") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.textAlign).toBe("center");
  });
});

describe("Text", () => {
  it("renderiza o HTML do campo html (conteudo do autor, sem sanitizacao — AD-024)", () => {
    const { container } = withBlock(Text, {
      id: "t1",
      type: "text",
      html: 'Um <strong>link</strong> e <a href="#x">ancora</a>',
    });
    expect(container.querySelector("strong")?.textContent).toBe("link");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("#x");
  });
});

describe("Quote", () => {
  it("renderiza o texto e a autoria quando presente", () => {
    withBlock(Quote, { id: "q1", type: "quote", text: "Frase", cite: "Autor" });
    expect(screen.getByText("Frase")).toBeInTheDocument();
    expect(screen.getByText("Autor")).toBeInTheDocument();
  });
});
