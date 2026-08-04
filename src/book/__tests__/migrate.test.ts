import { describe, it, expect } from "vitest";
import { migrateDoc } from "../migrate";
import { SCHEMA_VERSION, type BookDoc } from "../schema";

// Testes de migracao (DOC-01 / DOC-02). Derivam dos AC: erro em documento sem
// versao, so-leitura na versao futura, idempotencia na versao corrente e — o mais
// importante — sobrevivencia de bloco desconhecido ao round-trip.

const validDoc = (): BookDoc => ({
  schemaVersion: SCHEMA_VERSION,
  id: "doc-1",
  title: "Volume",
  surface: "manuscript",
  pages: [],
});

describe("migrateDoc", () => {
  it("lanca erro descritivo em documento sem schemaVersion", () => {
    expect(() => migrateDoc({ id: "x", pages: [] })).toThrow(/schemaVersion/);
  });

  it("lanca erro em schemaVersion nao numerico", () => {
    expect(() => migrateDoc({ schemaVersion: "1", pages: [] })).toThrow(/schemaVersion/);
  });

  it("lanca erro em entrada que nao e objeto", () => {
    expect(() => migrateDoc(null)).toThrow();
    expect(() => migrateDoc([])).toThrow();
  });

  it("documento de versao futura volta marcado como somente-leitura", () => {
    const future = { ...validDoc(), schemaVersion: SCHEMA_VERSION + 5 };
    const result = migrateDoc(future);
    expect(result.readOnly).toBe(true);
    expect(result.doc.schemaVersion).toBe(SCHEMA_VERSION + 5);
  });

  it("documento na versao corrente volta sem alteracao e editavel", () => {
    const doc = validDoc();
    const result = migrateDoc(doc);
    expect(result.readOnly).toBe(false);
    expect(result.doc).toEqual(doc);
  });

  it("e idempotente: migrar um documento ja migrado nao muda nada", () => {
    const doc = validDoc();
    const once = migrateDoc(doc).doc;
    const twice = migrateDoc(once).doc;
    expect(twice).toEqual(once);
  });

  it("bloco de type desconhecido sobrevive a migrateDoc -> stringify -> parse", () => {
    const doc = {
      ...validDoc(),
      pages: [
        {
          id: "p1",
          blocks: [
            {
              id: "b1",
              type: "inventado",
              // campos arbitrarios que um cliente futuro entenderia:
              corDeFundo: "#123456",
              nivel: 7,
              meta: { aninhado: true },
            },
          ],
        },
      ],
    };

    const migrated = migrateDoc(doc).doc;
    const roundTripped = JSON.parse(JSON.stringify(migrated)) as typeof doc;
    const block = roundTripped.pages[0].blocks[0] as Record<string, unknown>;

    expect(block.type).toBe("inventado");
    expect(block.corDeFundo).toBe("#123456");
    expect(block.nivel).toBe(7);
    expect(block.meta).toEqual({ aninhado: true });
  });
});
