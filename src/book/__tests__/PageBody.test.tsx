import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageBody } from "../PageBody";
import { getSurface, registerSurface } from "../surfaces/registry";
import type { RenderCtx } from "../RenderCtx";
import type { BlockRenderProps, SurfaceDef } from "../RenderCtx";
import type { BookPage } from "../schema";

// Surface de teste com um bloco que lança, para exercitar o isolamento de falha.
function Boom(_props: BlockRenderProps): never {
  throw new Error("bloco explodiu");
}
const surface: SurfaceDef = {
  id: "pb-test",
  label: "PageBody test",
  layouts: [],
  theme: {},
  defaultWindowRadius: 4,
  blocks: { boom: Boom },
};
registerSurface(surface);

const ctxFor = (id: string): RenderCtx =>
  ({
    doc: { schemaVersion: 1, id: "d", title: "t", surface: id, pages: [] },
    surface: getSurface(id),
    mode: "read",
    assetUrl: (ref: { id: string }) => ref.id,
  }) as unknown as RenderCtx;

const page = (blocks: BookPage["blocks"]): BookPage => ({ id: "p1", blocks });

describe("PageBody", () => {
  it("resolve e renderiza os blocos conhecidos pela tabela da surface", () => {
    render(
      <PageBody
        page={page([
          { id: "b1", type: "heading", text: "Titulo" },
          { id: "b2", type: "text", html: "<em>corpo</em>" },
        ])}
        ctx={ctxFor("pb-test")}
      />,
    );
    expect(screen.getByText("Titulo")).toBeInTheDocument();
    expect(screen.getByText("corpo")).toBeInTheDocument();
  });

  it("pula bloco de type nao registrado, e o resto da pagina aparece normalmente", () => {
    render(
      <PageBody
        page={page([
          { id: "b1", type: "heading", text: "Antes" },
          { id: "b2", type: "inventado", qualquer: 1 },
          { id: "b3", type: "heading", text: "Depois" },
        ])}
        ctx={ctxFor("pb-test")}
      />,
    );
    expect(screen.getByText("Antes")).toBeInTheDocument();
    expect(screen.getByText("Depois")).toBeInTheDocument();
  });

  it("contem bloco que lança pelo boundary; o irmao anterior continua no DOM", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <PageBody
        page={page([
          { id: "b1", type: "heading", text: "Sobrevivente" },
          { id: "b2", type: "boom" },
          { id: "b3", type: "heading", text: "Posterior" },
        ])}
        ctx={ctxFor("pb-test")}
      />,
    );
    // o bloco anterior e o posterior sobrevivem; so o boom some
    expect(screen.getByText("Sobrevivente")).toBeInTheDocument();
    expect(screen.getByText("Posterior")).toBeInTheDocument();
  });

  it("borda: pagina com blocks: [] renderiza em branco sem lançar", () => {
    const { container } = render(<PageBody page={page([])} ctx={ctxFor("pb-test")} />);
    expect(container.querySelector(".bk-page")).not.toBeNull();
    expect(container.querySelector(".bk-page")?.children.length).toBe(0);
  });

  it("nao emite aviso de key do React (cada bloco usa block.id)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <PageBody
        page={page([
          { id: "k1", type: "rule" },
          { id: "k2", type: "rule" },
        ])}
        ctx={ctxFor("pb-test")}
      />,
    );
    expect(spy.mock.calls.some((c) => String(c[0]).toLowerCase().includes("key"))).toBe(false);
  });
});
