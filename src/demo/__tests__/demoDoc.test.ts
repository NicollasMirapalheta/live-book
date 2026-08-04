import { describe, it, expect } from "vitest";
import { demoDoc } from "../demoDoc";
import { migrateDoc } from "../../book/migrate";

describe("demoDoc", () => {
  it("passa em migrateDoc sem alteracao", () => {
    const result = migrateDoc(demoDoc);
    expect(result.readOnly).toBe(false);
    expect(result.doc).toEqual(demoDoc);
  });

  it("tem 10 paginas de miolo, capa e contracapa", () => {
    expect(demoDoc.pages).toHaveLength(10);
    expect(demoDoc.cover?.blocks.length).toBeGreaterThan(0);
    expect(demoDoc.backCover?.blocks.length).toBeGreaterThan(0);
  });

  it("preserva os 3 capitulos do demo, na ordem, com tone chapter", () => {
    const chapters = demoDoc.pages
      .filter((p) => p.chapter)
      .map((p) => ({ chapter: p.chapter, tone: p.tone }));
    expect(chapters).toEqual([
      { chapter: "01 · Começando", tone: "chapter" },
      { chapter: "02 · No dia a dia", tone: "chapter" },
      { chapter: "03 · Notas", tone: "chapter" },
    ]);
  });

  it("a primeira pagina e o sumario com tone accent", () => {
    expect(demoDoc.pages[0].tone).toBe("accent");
  });
});
