import { describe, it, expect } from "vitest";
import { renderBook } from "./renderBook";
import { asFace, leafOfFace } from "../../book/units";

// Caracterizacao do sumario e da numeracao (FUND-06). O ponto central: a folha
// que o motor associa a um capitulo deve ser leafOfFace(face) — a formula real de
// src/book/units.ts. Amarrar as duas e o que teria pego o bug da v1 (capitulos um
// spread adiante).

const FULL = 999;

// A face de uma pagina de conteudo de indice k e k + 2: a casca ocupa as faces 0
// (capa) e 1 (guarda) antes do miolo.
const faceOfContentPage = (k: number) => asFace(k + 2);

describe("sumario e numeracao", () => {
  it("cada capitulo aparece no sumario na folha leafOfFace(face)", () => {
    const chapters = { 0: "01 · Comecando", 4: "02 · No dia a dia", 7: "03 · Notas" };
    const book = renderBook(10, { windowRadius: FULL, chapters });

    const contentIndices = [0, 4, 7];
    contentIndices.forEach((k, ordinal) => {
      const expected = leafOfFace(faceOfContentPage(k));
      expect(book.chapterLeaf(ordinal)).toBe(expected);
    });
  });

  it("o sumario lista os rotulos de capitulo na ordem das paginas", () => {
    const chapters = { 0: "01 · Comecando", 4: "02 · No dia a dia", 7: "03 · Notas" };
    const book = renderBook(10, { windowRadius: FULL, chapters });
    expect(book.tocLabels()).toEqual([
      "01 · Comecando",
      "02 · No dia a dia",
      "03 · Notas",
    ]);
  });

  it("o numero impresso do capitulo no sumario e o da sua pagina de miolo", () => {
    const chapters = { 0: "01 · Comecando", 4: "02 · No dia a dia" };
    const book = renderBook(10, { windowRadius: FULL, chapters });
    // pagina de conteudo k imprime k + 1
    expect(book.tocPrintedNumbers()).toEqual([1, 5]);
  });

  it("a primeira pagina de miolo tem numero impresso 1", () => {
    const book = renderBook(10, { windowRadius: FULL });
    expect(book.printedNumbers()[0]).toBe(1);
  });

  it("borda: nenhuma pagina com chapter produz sumario vazio, sem erro", () => {
    const book = renderBook(5, { windowRadius: FULL });
    expect(book.tocLabels()).toEqual([]);
  });
});
