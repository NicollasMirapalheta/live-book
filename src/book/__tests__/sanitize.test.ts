import { describe, it, expect } from "vitest";
import { sanitizeDoc } from "../sanitize";
import { SCHEMA_VERSION, type BookDoc, type Block } from "../schema";

// Testes de sanitizacao (DATA-09). Derivam dos AC da spec:
//  AC1 <script> num bloco text nao sobrevive
//  AC2 atributos de evento (onerror/onload) removidos
//  AC3 HTML legitimo de formatacao preservado
// Mais os done-when da T2: bloco de type desconhecido passa intacto; callout tambem
// e sanitizado (design). AC4 (ordem antes do render) e coberto por loadDoc (T3).

const docWith = (blocks: Block[], cover?: Block[]): BookDoc => ({
  schemaVersion: SCHEMA_VERSION,
  id: "doc-1",
  title: "Volume",
  surface: "manuscript",
  cover: cover ? { blocks: cover } : undefined,
  pages: [{ id: "p1", blocks }],
});

describe("sanitizeDoc", () => {
  it("remove <script> de bloco text (DATA-09 AC1)", () => {
    const out = sanitizeDoc(
      docWith([{ id: "b1", type: "text", html: '<p>oi</p><script>alert(1)</script>' }]),
    );
    const html = (out.pages[0].blocks[0] as { html: string }).html;
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain("alert(1)");
    expect(html).toContain("<p>oi</p>");
  });

  it("remove atributo onerror de bloco text (DATA-09 AC2)", () => {
    const out = sanitizeDoc(
      docWith([{ id: "b1", type: "text", html: '<img src="x" onerror="alert(1)">' }]),
    );
    const html = (out.pages[0].blocks[0] as { html: string }).html;
    expect(html).not.toMatch(/onerror/i);
  });

  it("remove atributo onload de bloco text (DATA-09 AC2)", () => {
    const out = sanitizeDoc(
      docWith([{ id: "b1", type: "text", html: '<svg onload="alert(1)"></svg>' }]),
    );
    const html = (out.pages[0].blocks[0] as { html: string }).html;
    expect(html).not.toMatch(/onload/i);
  });

  it("preserva HTML legitimo de formatacao e classes (DATA-09 AC3)", () => {
    const legit =
      '<div class="lb-prose"><h2>Titulo</h2><p><strong>forte</strong> e <em>enfase</em></p>' +
      "<ul><li>um</li><li>dois</li></ul></div>";
    const out = sanitizeDoc(docWith([{ id: "b1", type: "text", html: legit }]));
    const html = (out.pages[0].blocks[0] as { html: string }).html;
    expect(html).toContain('class="lb-prose"');
    expect(html).toContain("<h2>Titulo</h2>");
    expect(html).toContain("<strong>forte</strong>");
    expect(html).toContain("<em>enfase</em>");
    expect(html).toContain("<li>um</li>");
  });

  it("sanitiza tambem o bloco callout (design: text/callout)", () => {
    const out = sanitizeDoc(
      docWith([{ id: "b1", type: "callout", html: '<p>nota</p><script>evil()</script>' }]),
    );
    const html = (out.pages[0].blocks[0] as { html: string }).html;
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain("<p>nota</p>");
  });

  it("sanitiza blocos text da capa, nao so das paginas (DATA-09 AC1)", () => {
    const out = sanitizeDoc(
      docWith(
        [{ id: "p-b", type: "text", html: "<p>corpo</p>" }],
        [{ id: "c-b", type: "text", html: '<h1>Capa</h1><script>xss()</script>' }],
      ),
    );
    const coverHtml = (out.cover!.blocks[0] as { html: string }).html;
    expect(coverHtml).not.toMatch(/<script/i);
    expect(coverHtml).toContain("<h1>Capa</h1>");
  });

  it("bloco de type desconhecido passa intacto (done-when T2)", () => {
    const unknown: Block = {
      id: "u1",
      type: "inventado",
      html: "<script>nao mexa</script>",
      corDeFundo: "#123456",
      nivel: 7,
      meta: { aninhado: true },
    } as unknown as Block;
    const out = sanitizeDoc(docWith([unknown]));
    expect(out.pages[0].blocks[0]).toEqual(unknown);
  });

  it("nao muta o documento de entrada", () => {
    const input = docWith([{ id: "b1", type: "text", html: "<p>x</p><script>y()</script>" }]);
    const before = JSON.parse(JSON.stringify(input));
    sanitizeDoc(input);
    expect(input).toEqual(before);
  });
});
