/**
 * T13 — layouts duo, grid, photo-text (MEDIA-06 AC2). Done-when:
 *  - duo, grid, photo-text produzem resultados visualmente distintos entre si e dos
 *    de T12
 *  - seed() de cada um devolve blocos iniciais coerentes
 *
 * grid reusa o bloco de nucleo `gallery`; photo-text combina foto + o bloco de
 * nucleo `text` (sem introduzir bloco de HTML novo — AD-024/AD-026).
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "../index"; // registra album (blocos + layouts)
import { getSurface } from "../../registry";
import { PageBody } from "../../../PageBody";
import { newAlbumPage, seedFor } from "../layouts";
import type { RenderCtx } from "../../../RenderCtx";
import type { BookDoc, BookPage } from "../../../schema";

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

describe("album layouts B — registro e seed coerente (MEDIA-06 AC2)", () => {
  it("os tres layouts novos estao registrados na surface", () => {
    const ids = getSurface("album").layouts.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["duo", "grid", "photo-text"]));
  });

  it("seed() devolve blocos iniciais coerentes por layout", () => {
    expect(seedFor("duo").map((b) => b.type)).toEqual(["album-duo"]);
    // grid reusa o bloco de nucleo gallery
    expect(seedFor("grid").map((b) => b.type)).toEqual(["gallery"]);
    // photo-text: foto + texto (bloco de nucleo)
    expect(seedFor("photo-text").map((b) => b.type)).toEqual(["album-photo", "text"]);
  });
});

describe("album layouts B — resultados distintos entre si e dos de T12", () => {
  it("duo renderiza um par de fotos (bloco album-duo, distinto de single)", () => {
    const { container } = renderPage(newAlbumPage("duo"));
    const duo = container.querySelector(".bk-album-duo");
    expect(duo).toBeTruthy();
    expect(duo!.querySelectorAll(".bk-album-duo__img")).toHaveLength(2);
    // nao e a foto unica de single
    expect(container.querySelector(".bk-album-photo")).toBeNull();
  });

  it("grid renderiza a grade do bloco gallery (distinto de duo)", () => {
    const { container } = renderPage(newAlbumPage("grid"));
    expect(container.querySelector(".bk-gallery")).toBeTruthy();
    expect(container.querySelector(".bk-album-duo")).toBeNull();
  });

  it("photo-text combina foto E texto (distinto de single, text e duo)", () => {
    const { container } = renderPage(newAlbumPage("photo-text"));
    expect(container.querySelector(".bk-album-photo")).toBeTruthy();
    expect(container.querySelector(".bk-text")).toBeTruthy();
    // nao e grade nem par
    expect(container.querySelector(".bk-gallery")).toBeNull();
    expect(container.querySelector(".bk-album-duo")).toBeNull();
  });
});
