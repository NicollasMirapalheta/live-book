import { describe, it, expect } from "vitest";
import { runReadContract } from "../../__tests__/adapter.contract";
import { PublicAdapter } from "../PublicAdapter";
import { LocalAdapter } from "../../local/LocalAdapter";
import { WriteForbiddenError } from "../../StorageAdapter";
import { createEmptyDoc, createPage, createBlock } from "../../../book/factory";
import type { Block, BookDoc } from "../../../book/schema";

// T7: PublicAdapter roda o subconjunto de LEITURA do contrato (via um LocalAdapter
// semeado como origem) e RECUSA toda escrita (DATA-03 AC4).

function seededDoc(): BookDoc {
  const doc = createEmptyDoc({
    title: "Compartilhado",
    pages: [createPage({ blocks: [createBlock("text", { html: "<p>ola</p>" })] })],
  });
  // um bloco desconhecido, para provar round-trip fiel tambem na leitura publica:
  doc.pages.push({
    id: "p-unknown",
    blocks: [{ id: "u1", type: "inventado", val: 42 } as unknown as Block],
  });
  return doc;
}

// --- Subconjunto de leitura do contrato --------------------------------------
runReadContract("public", async () => {
  const doc = seededDoc();
  const backing = new LocalAdapter(`pub-${crypto.randomUUID()}`);
  const { id } = await backing.createBook(doc);
  return { adapter: new PublicAdapter(backing), seededId: id, seededDoc: doc };
});

// --- Recusa de escrita --------------------------------------------------------
describe("PublicAdapter — recusa de escrita (DATA-03 AC4)", () => {
  const make = () => new PublicAdapter(new LocalAdapter(`pub-w-${crypto.randomUUID()}`));

  it("canWrite e false (desliga o cromo de edicao)", () => {
    expect(make().canWrite).toBe(false);
  });

  it("createBook rejeita com WriteForbiddenError", async () => {
    await expect(make().createBook(seededDoc())).rejects.toBeInstanceOf(WriteForbiddenError);
  });

  it("saveBook rejeita com WriteForbiddenError", async () => {
    await expect(make().saveBook("x", seededDoc(), 1)).rejects.toBeInstanceOf(
      WriteForbiddenError,
    );
  });

  it("deleteBook rejeita com WriteForbiddenError", async () => {
    await expect(make().deleteBook("x")).rejects.toBeInstanceOf(WriteForbiddenError);
  });

  it("restoreRevision rejeita com WriteForbiddenError", async () => {
    await expect(make().restoreRevision("x", "r1")).rejects.toBeInstanceOf(WriteForbiddenError);
  });

  it("gcAssets rejeita com WriteForbiddenError", async () => {
    await expect(make().gcAssets("x")).rejects.toBeInstanceOf(WriteForbiddenError);
  });

  it("assetUrl continua sincrona e devolve string", () => {
    expect(make().assetUrl({ id: "a1" })).toBe("a1");
  });
});
