/**
 * T12 — layouts full-bleed, single, text (MEDIA-06 AC2/AC3). Done-when:
 *  - full-bleed sangra e NAO mostra numero; single/text produzem resultados distintos
 *  - seed() de cada layout devolve blocos iniciais coerentes
 *
 * A supressao do numero e provada pelo caminho generico: newAlbumPage("full-bleed")
 * carrega page.hideNumber=true, que o renderPages INALTERADO propaga ao <Page>.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "../index"; // registra album (blocos + layouts)
import { getSurface } from "../../registry";
import { PageBody } from "../../../PageBody";
import { renderPages } from "../../../renderPages";
import { newAlbumPage, seedFor } from "../layouts";
import type { RenderCtx } from "../../../RenderCtx";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../../../schema";

function ctx(): RenderCtx {
  return {
    doc: {} as BookDoc,
    surface: getSurface("album"),
    mode: "read",
    assetUrl: (ref, size) => `u:${ref.id}:${size ?? ""}`,
  };
}

function renderPage(page: BookPage) {
  return render(<PageBody page={page} ctx={ctx()} />);
}

function albumDoc(pages: BookPage[]): BookDoc {
  return { schemaVersion: SCHEMA_VERSION, id: "d", title: "Álbum", surface: "album", pages };
}

describe("album layouts — registro e seed coerente (MEDIA-06 AC2)", () => {
  it("os tres layouts estao registrados na surface", () => {
    const ids = getSurface("album").layouts.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["full-bleed", "single", "text"]));
  });

  it("seed() devolve blocos iniciais coerentes por layout", () => {
    expect(seedFor("full-bleed").map((b) => b.type)).toEqual(["album-photo"]);
    expect(seedFor("single").map((b) => b.type)).toEqual(["album-photo"]);
    // text reusa o bloco de nucleo `text` (nao um bloco de HTML novo do album)
    expect(seedFor("text").map((b) => b.type)).toEqual(["text"]);
  });
});

describe("album layout full-bleed — sangra e suprime numero (MEDIA-06 AC3)", () => {
  it("a foto full-bleed renderiza com a classe de sangria", () => {
    const { container } = renderPage(newAlbumPage("full-bleed"));
    const photo = container.querySelector(".bk-album-photo");
    expect(photo).toBeTruthy();
    // sangra ate a borda: classe --full aplicada
    expect(photo!.classList.contains("bk-album-photo--full")).toBe(true);
  });

  it("uma pagina full-bleed suprime a numeracao via renderPages (page.hideNumber)", () => {
    const doc = albumDoc([newAlbumPage("full-bleed"), newAlbumPage("single")]);
    const pages = renderPages(doc, ctx());
    // full-bleed: numero NAO aparece
    expect(pages[0].props.hideNumber).toBe(true);
    // single: numero aparece (nao suprimido)
    expect(pages[1].props.hideNumber).toBeFalsy();
  });
});

describe("album layouts — single, full-bleed e text produzem resultados distintos", () => {
  it("single renderiza a foto SEM sangria (distinto do full-bleed)", () => {
    const { container } = renderPage(newAlbumPage("single"));
    const photo = container.querySelector(".bk-album-photo");
    expect(photo).toBeTruthy();
    expect(photo!.classList.contains("bk-album-photo--full")).toBe(false);
  });

  it("text renderiza um bloco de texto e NENHUMA foto (distinto dos de imagem)", () => {
    const { container } = renderPage(newAlbumPage("text"));
    expect(container.querySelector(".bk-text")).toBeTruthy();
    expect(container.querySelector(".bk-album-photo")).toBeNull();
  });
});
