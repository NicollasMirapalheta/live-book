import { describe, it, expect } from "vitest";
import { chapterSlugs, resolveChapterPage, slugify } from "../chapters";
import { asPageNumber, type PageNumber } from "../units";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../schema";
import { demoDoc } from "../../demo/demoDoc";

// LIB-03 (T2): slug determinístico de capítulo → PageNumber. Testes derivados dos
// AC/edge cases: slug estável, primeiro vence em colisão, PageNumber via units,
// slug inexistente resolvido para a 1ª página.

function docOf(pages: BookPage[]): BookDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "t",
    title: "T",
    surface: "manuscript",
    pages,
  };
}

const page = (id: string, chapter?: string): BookPage => ({ id, blocks: [], chapter });

describe("slugify", () => {
  it("remove acentos, minúsculo, separa por hífen sem bordas", () => {
    expect(slugify("01 · Começando")).toBe("01-comecando");
  });

  it("colapsa símbolos e espaços em um único hífen", () => {
    expect(slugify("No dia a dia!")).toBe("no-dia-a-dia");
  });
});

describe("chapterSlugs", () => {
  it("lista os capítulos na ordem do documento", () => {
    const chapters = chapterSlugs(demoDoc);
    expect(chapters.map((c) => c.label)).toEqual([
      "01 · Começando",
      "02 · No dia a dia",
      "03 · Notas",
    ]);
  });

  it("atribui o PageNumber 1-based da posição no miolo (via units)", () => {
    const chapters = chapterSlugs(demoDoc);
    // capítulos nos índices 1, 4, 7 do array de páginas → páginas impressas 2, 5, 8
    expect(chapters.map((c) => c.page)).toEqual(
      [2, 5, 8].map((n) => asPageNumber(n)) as PageNumber[],
    );
  });

  it("ignora páginas sem chapter", () => {
    const chapters = chapterSlugs(docOf([page("a"), page("b", "Intro"), page("c")]));
    expect(chapters).toHaveLength(1);
    expect(chapters[0]).toEqual({ slug: "intro", page: asPageNumber(2), label: "Intro" });
  });

  it("em colisão de slug, o PRIMEIRO capítulo vence (determinístico)", () => {
    // "Notas" (índice 0) e "notas!" (índice 2) colidem em "notas".
    const chapters = chapterSlugs(docOf([page("a", "Notas"), page("b"), page("c", "notas!")]));
    const notas = chapters.filter((c) => c.slug === "notas");
    expect(notas).toHaveLength(1);
    expect(notas[0].label).toBe("Notas");
    expect(notas[0].page).toBe(asPageNumber(1));
  });
});

describe("resolveChapterPage", () => {
  it("resolve um slug existente para o PageNumber do capítulo", () => {
    expect(resolveChapterPage(demoDoc, "02-no-dia-a-dia")).toBe(asPageNumber(5));
  });

  it("slug inexistente cai na 1ª página, sem erro (edge case)", () => {
    expect(resolveChapterPage(demoDoc, "nao-existe")).toBe(asPageNumber(1));
  });
});
