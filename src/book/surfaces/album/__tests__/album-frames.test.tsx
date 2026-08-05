/**
 * T14 — molduras plain/polaroid/bleed/circle (MEDIA-07 AC4, edge case de aspecto
 * extremo). Done-when:
 *  - as 4 molduras produzem 4 resultados distintos (classe/estrutura distinta)
 *  - imagem de proporcao extrema e contida sem distorcer (object-fit)
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AlbumPhoto, type AlbumFrame } from "../blocks/AlbumPhoto";
import { albumPhoto } from "../blocks";
import type { Block, AssetRef } from "../../../schema";
import type { RenderCtx } from "../../../RenderCtx";

const ctx = { assetUrl: (ref: AssetRef) => `a:${ref.id}` } as unknown as RenderCtx;

function renderPhoto(frame: AlbumFrame | undefined, asset: AssetRef = { id: "x", w: 800, h: 600 }) {
  const block = albumPhoto({ asset, frame }) as unknown as Block;
  return render(<AlbumPhoto block={block} ctx={ctx} />);
}

const FRAMES: AlbumFrame[] = ["plain", "polaroid", "bleed", "circle"];

describe("album molduras — 4 resultados distintos (MEDIA-07 AC4)", () => {
  it("cada moldura aplica sua classe modificadora propria", () => {
    for (const frame of FRAMES) {
      const { container } = renderPhoto(frame);
      const photo = container.querySelector(".bk-album-photo") as HTMLElement;
      expect(photo.classList.contains(`bk-album-photo--${frame}`)).toBe(true);
    }
  });

  it("as 4 molduras sao mutuamente distintas (nenhuma classe repetida)", () => {
    const classes = FRAMES.map((frame) => {
      const { container } = renderPhoto(frame);
      return (container.querySelector(".bk-album-photo") as HTMLElement).className;
    });
    expect(new Set(classes).size).toBe(4);
  });

  it("moldura ausente vira plain (padrao)", () => {
    const { container } = renderPhoto(undefined);
    const photo = container.querySelector(".bk-album-photo") as HTMLElement;
    expect(photo.classList.contains("bk-album-photo--plain")).toBe(true);
  });
});

describe("album molduras — aspecto extremo contido sem distorcer", () => {
  it("proporcao extrema usa object-fit (preserva aspecto, nao estica) e reserva a caixa", () => {
    const { container } = renderPhoto("circle", { id: "pano", w: 4000, h: 200 });
    const img = container.querySelector("img") as HTMLImageElement;
    // object-fit contem sem distorcer
    expect(img.style.objectFit).toBe("cover");
    // caixa reservada pelas dimensoes intrinsecas (sem deslocamento de layout)
    expect(img.getAttribute("width")).toBe("4000");
    expect(img.getAttribute("height")).toBe("200");
  });
});
