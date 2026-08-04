import { describe, it, expect } from "vitest";
import { createBlock, createEmptyDoc, createPage } from "../factory";
import { migrateDoc } from "../migrate";
import { SCHEMA_VERSION } from "../schema";

describe("createEmptyDoc", () => {
  it("nasce na versao corrente, com id uuid e pages vazio", () => {
    const doc = createEmptyDoc();
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
    expect(doc.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(doc.pages).toEqual([]);
    expect(doc.surface).toBe("manuscript");
  });

  it("passa em migrateDoc sem alteracao", () => {
    const doc = createEmptyDoc({ title: "Album" });
    const result = migrateDoc(doc);
    expect(result.readOnly).toBe(false);
    expect(result.doc).toEqual(doc);
  });

  it("borda: documento com pages: [] e valido", () => {
    const doc = createEmptyDoc({ pages: [] });
    expect(() => migrateDoc(doc)).not.toThrow();
  });
});

describe("createPage", () => {
  it("cria pagina com id uuid e blocos vazios por padrao", () => {
    const page = createPage();
    expect(page.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(page.blocks).toEqual([]);
  });

  it("aplica overrides (chapter, title, tone)", () => {
    const page = createPage({ chapter: "01 · Cap", title: "Intro", tone: "chapter" });
    expect(page.chapter).toBe("01 · Cap");
    expect(page.title).toBe("Intro");
    expect(page.tone).toBe("chapter");
  });
});

describe("createBlock", () => {
  it("cria bloco com id uuid, type e defaults do tipo", () => {
    const heading = createBlock("heading");
    expect(heading.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(heading.type).toBe("heading");
    expect(heading.text).toBe("");
  });

  it("aplica props sobre os defaults", () => {
    const heading = createBlock("heading", { text: "Titulo", level: 1 });
    expect(heading.text).toBe("Titulo");
    expect(heading.level).toBe(1);
  });

  it("cria blocos de midia com a forma esperada", () => {
    const image = createBlock("image", { asset: { id: "a1", w: 800, h: 600 } });
    expect(image.type).toBe("image");
    expect(image.asset).toEqual({ id: "a1", w: 800, h: 600 });
    const gallery = createBlock("gallery", { columns: 3 });
    expect(gallery.items).toEqual([]);
    expect(gallery.columns).toBe(3);
  });
});

describe("unicidade de ids", () => {
  it("gera ids diferentes entre chamadas", () => {
    const ids = new Set([
      createEmptyDoc().id,
      createEmptyDoc().id,
      createPage().id,
      createPage().id,
      createBlock("rule").id,
      createBlock("rule").id,
    ]);
    expect(ids.size).toBe(6);
  });
});
