import { describe, it, expect } from "vitest";
import {
  asFace,
  asPageNumber,
  faceOfPageNumber,
  leafOfFace,
  leafOfPageNumber,
  pageNumberOfFace,
  type LeafIndex,
} from "../units";

// Testes tabelados: cada linha traz o valor esperado explicito. Derivam das
// conversoes canonicas de docs/domain/ubiquitous-language.md e dos AC de FUND-03.

describe("leafOfFace — ceil(f / 2)", () => {
  const table: Array<[face: number, leaf: number, why: string]> = [
    [0, 0, "capa aparece com o livro fechado"],
    [1, 1, "guarda e verso; so aparece com a capa virada"],
    [2, 1, "primeira pagina do miolo, a direita"],
    [3, 2, "verso da primeira folha do miolo"],
    [4, 2, "segunda pagina do miolo, a direita"],
    [5, 3, "verso da segunda folha do miolo"],
  ];
  it.each(table)("leafOfFace(%i) = %i (%s)", (face, leaf) => {
    expect(leafOfFace(asFace(face))).toBe(leaf);
  });
});

describe("leafOfPageNumber — ceil((n + 1) / 2)", () => {
  const table: Array<[page: number, leaf: number]> = [
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
  ];
  it.each(table)("leafOfPageNumber(%i) = %i", (page, leaf) => {
    expect(leafOfPageNumber(asPageNumber(page))).toBe(leaf);
  });
});

describe("faceOfPageNumber — n + 1", () => {
  it("pagina 1 mora na face 2 (apos capa e guarda)", () => {
    expect(faceOfPageNumber(asPageNumber(1))).toBe(2);
  });
  it("pagina 7 mora na face 8", () => {
    expect(faceOfPageNumber(asPageNumber(7))).toBe(8);
  });
});

describe("pageNumberOfFace — f - 1, so miolo", () => {
  it("face de miolo devolve o numero impresso", () => {
    expect(pageNumberOfFace(asFace(2))).toBe(1);
    expect(pageNumberOfFace(asFace(3))).toBe(2);
  });
  it("face de casca devolve null (capa)", () => {
    expect(pageNumberOfFace(asFace(0))).toBeNull();
  });
  it("face de casca devolve null (guarda) — caso de borda da spec", () => {
    expect(pageNumberOfFace(asFace(1))).toBeNull();
  });
});

describe("ida-e-volta: pageNumberOfFace(faceOfPageNumber(n)) === n", () => {
  it("e idempotente para todo n de 1 a 50", () => {
    for (let n = 1; n <= 50; n += 1) {
      expect(pageNumberOfFace(faceOfPageNumber(asPageNumber(n)))).toBe(n);
    }
  });
});

describe("incompatibilidade de tipo (guarda de compilacao)", () => {
  it("o compilador rejeita a unidade errada", () => {
    // Estas linhas nao devem compilar. O @ts-expect-error VIRA erro se a
    // incompatibilidade sumir (ex.: brands removidos), entao o typecheck acusa
    // que a protecao desapareceu.
    const needsLeaf = (_l: LeafIndex): void => {};

    // @ts-expect-error PageNumber nao e LeafIndex (FUND-04 AC 6)
    needsLeaf(asPageNumber(1));
    // @ts-expect-error PageNumber nao e FaceIndex
    leafOfFace(asPageNumber(2));
    // @ts-expect-error numero cru nao entra sem construtor
    leafOfFace(2);

    expect(true).toBe(true);
  });
});
