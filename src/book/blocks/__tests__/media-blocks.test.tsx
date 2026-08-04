import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Image } from "../Image";
import { Gallery } from "../Gallery";
import type { RenderCtx } from "../../RenderCtx";
import type { AssetRef } from "../../schema";

// ctx com assetUrl por identidade (Fase 1): a URL e o proprio id do asset.
const ctx = { assetUrl: (ref: AssetRef) => `asset:${ref.id}` } as unknown as RenderCtx;

describe("Image", () => {
  it("emite width e height do AssetRef para reservar a caixa", () => {
    const { container } = render(
      <Image block={{ id: "i1", type: "image", asset: { id: "a1", w: 800, h: 600 } }} ctx={ctx} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("width")).toBe("800");
    expect(img.getAttribute("height")).toBe("600");
    expect(img.getAttribute("src")).toBe("asset:a1");
  });

  it("usa loading=eager e decoding=async (lazy e proibido — ADR-005)", () => {
    const { container } = render(
      <Image block={{ id: "i2", type: "image", asset: { id: "a2", w: 100, h: 100 } }} ctx={ctx} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("loading")).not.toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
  });

  it("aplica lqip como background-image no wrapper quando presente", () => {
    const { container } = render(
      <Image
        block={{ id: "i3", type: "image", asset: { id: "a3", w: 100, h: 100, lqip: "data:image/x,abc" } }}
        ctx={ctx}
      />,
    );
    const frame = container.querySelector(".bk-image__frame") as HTMLElement;
    expect(frame.style.backgroundImage).toContain("data:image/x,abc");
  });

  it("alt sempre emitido; ausente vira string vazia (decorativa)", () => {
    const { container } = render(
      <Image block={{ id: "i4", type: "image", asset: { id: "a4", w: 10, h: 10 } }} ctx={ctx} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("alt")).toBe("");
  });

  it("borda: AssetRef sem w/h renderiza sem reserva de caixa, sem quebrar", () => {
    const { container } = render(
      <Image block={{ id: "i5", type: "image", asset: { id: "a5" } }} ctx={ctx} />,
    );
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("width")).toBeNull();
    expect(img.getAttribute("height")).toBeNull();
  });
});

describe("Gallery", () => {
  it("respeita columns 3", () => {
    const { container } = render(
      <Gallery
        block={{
          id: "g1",
          type: "gallery",
          columns: 3,
          items: [{ asset: { id: "x1" } }, { asset: { id: "x2" } }, { asset: { id: "x3" } }],
        }}
        ctx={ctx}
      />,
    );
    const grid = container.querySelector(".bk-gallery") as HTMLElement;
    expect(grid.className).toContain("bk-gallery--cols-3");
    expect(grid.style.getPropertyValue("--bk-cols")).toBe("3");
    expect(container.querySelectorAll(".bk-gallery__img")).toHaveLength(3);
  });

  it("columns ausente vira 2", () => {
    const { container } = render(
      <Gallery block={{ id: "g2", type: "gallery", items: [{ asset: { id: "y1" } }] }} ctx={ctx} />,
    );
    expect(container.querySelector(".bk-gallery")?.className).toContain("bk-gallery--cols-2");
  });
});
