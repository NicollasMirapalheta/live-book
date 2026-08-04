import { describe, it, expect } from "vitest";
import { loadForRender } from "../loadDoc";
import { SCHEMA_VERSION, type BookDoc } from "../schema";

// Testes da borda de carga (T3; DATA-09 AC4, AD-026). Derivam dos done-when:
// compoe migrate -> sanitize na ordem certa; versao futura volta readOnly=true sem
// perder campos; bloco desconhecido sobrevive; sanitiza antes do render.

const docWithScript = (overrides: Partial<BookDoc> = {}): BookDoc => ({
  schemaVersion: SCHEMA_VERSION,
  id: "doc-1",
  title: "Volume",
  surface: "manuscript",
  pages: [
    { id: "p1", blocks: [{ id: "b1", type: "text", html: "<p>ok</p><script>xss()</script>" }] },
  ],
  ...overrides,
});

describe("loadForRender", () => {
  it("compoe migrate -> sanitize: doc corrente volta sanitizado e editavel (AC4)", () => {
    const { doc, readOnly } = loadForRender(docWithScript());
    const html = (doc.pages[0].blocks[0] as { html: string }).html;
    expect(readOnly).toBe(false);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<p>ok</p>");
  });

  it("versao futura volta readOnly=true, ainda sanitizada e sem perder campos (edge case)", () => {
    const future = {
      ...docWithScript(),
      schemaVersion: SCHEMA_VERSION + 5,
      campoFuturo: "preservar",
    };
    const { doc, readOnly } = loadForRender(future);
    expect(readOnly).toBe(true);
    expect((doc as unknown as { campoFuturo: string }).campoFuturo).toBe("preservar");
    expect(doc.schemaVersion).toBe(SCHEMA_VERSION + 5);
    const html = (doc.pages[0].blocks[0] as { html: string }).html;
    expect(html).not.toMatch(/<script/i);
  });

  it("bloco de type desconhecido sobrevive a loadForRender", () => {
    const doc = loadForRender(
      docWithScript({
        pages: [
          {
            id: "p1",
            blocks: [
              { id: "u1", type: "inventado", corDeFundo: "#123456", meta: { n: 7 } } as never,
            ],
          },
        ],
      }),
    ).doc;
    expect(doc.pages[0].blocks[0]).toEqual({
      id: "u1",
      type: "inventado",
      corDeFundo: "#123456",
      meta: { n: 7 },
    });
  });

  it("valida antes de sanitizar: doc sem schemaVersion lanca (migrate roda primeiro)", () => {
    expect(() => loadForRender({ id: "x", pages: [] })).toThrow(/schemaVersion/);
  });
});
