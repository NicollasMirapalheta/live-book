import { describe, it, expect } from "vitest";
import { leafForPage, pageForLeaf } from "../readerUrl";
import { asLeaf, asPageNumber, leafOfPageNumber } from "../../book/units";

// LIB-01 (T3): tradução número impresso ↔ folha, só via units. Testes derivados dos
// AC/edge cases: clamp fora de intervalo, capa → posição válida mais próxima,
// ida-volta no miolo, livro de uma página.

const MAX = 10;

describe("leafForPage — clamp e limites (LIB-01 AC5)", () => {
  it("acima do intervalo limita à última página válida", () => {
    expect(leafForPage(999, MAX)).toBe(leafOfPageNumber(asPageNumber(MAX)));
  });

  it("abaixo de 1 limita à primeira página válida", () => {
    expect(leafForPage(-5, MAX)).toBe(leafOfPageNumber(asPageNumber(1)));
  });

  it("uma página válida do miolo mapeia para a folha de units, sem alteração", () => {
    expect(leafForPage(5, MAX)).toBe(leafOfPageNumber(asPageNumber(5)));
  });

  it("página não numerada (capa: 0 ou não-numérica) cai na posição válida mais próxima", () => {
    expect(leafForPage(0, MAX)).toBe(leafOfPageNumber(asPageNumber(1)));
    expect(leafForPage(Number.NaN, MAX)).toBe(leafOfPageNumber(asPageNumber(1)));
  });
});

describe("pageForLeaf — número impresso canônico (recto)", () => {
  it("folha de casca (leaf 0 = capa) cai na posição válida mais próxima (página 1)", () => {
    expect(pageForLeaf(0, MAX)).toBe(asPageNumber(1));
  });

  it("nunca ultrapassa maxPage", () => {
    expect(pageForLeaf(999, MAX)).toBe(asPageNumber(MAX));
  });
});

describe("ida-volta no miolo", () => {
  // Recto (páginas ímpares) são canônicas: página → folha → página é identidade.
  it.each([1, 3, 5, 7, 9])("página recto %i sobrevive a página→folha→página", (n) => {
    expect(pageForLeaf(leafForPage(n, MAX), MAX)).toBe(asPageNumber(n));
  });

  // A garantia de navegação é folha → página → folha (bijetiva nas folhas do miolo):
  // vira, escreve a URL, volta pela URL, e cai na MESMA folha — sem laço nem deriva.
  it.each([1, 2, 3, 4, 5, 6])("folha do miolo %i sobrevive a folha→página→folha", (leaf) => {
    expect(leafForPage(pageForLeaf(leaf, MAX), MAX)).toBe(asLeaf(leaf));
  });
});

describe("livro de uma página só", () => {
  it("navega sem cair em estado inválido", () => {
    expect(leafForPage(1, 1)).toBe(leafOfPageNumber(asPageNumber(1)));
    expect(pageForLeaf(1, 1)).toBe(asPageNumber(1));
    // Fora do intervalo num livro de 1 página ainda resolve para a página 1.
    expect(leafForPage(9, 1)).toBe(leafOfPageNumber(asPageNumber(1)));
  });
});
