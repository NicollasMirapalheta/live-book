import { describe, it, expect } from "vitest";
import { renderBook } from "./renderBook";

// Caracterizacao da janela de virtualizacao (FUND-07). E o que mantem o custo
// de DOM/camadas constante num livro de 300+ paginas, e a rede que protege a
// alteracao do stageOffset na Fase 3.

describe("janela de virtualizacao", () => {
  it("com windowRadius 2 e 40 paginas, no maximo 7 folhas montadas", () => {
    // No meio do volume a janela esta cheia: 5 folhas (raio 2) + capa + contracapa.
    const book = renderBook(40, { windowRadius: 2, initialLeaf: 10 });
    expect(book.mountedLeaves()).toBeLessThanOrEqual(7);
    expect(book.mountedLeaves()).toBe(7);
  });

  it("capa e contracapa permanecem montadas mesmo fora da janela", () => {
    const book = renderBook(40, { windowRadius: 2, initialLeaf: 10 });
    const kinds = book.faceKinds();
    // leaf 0 (capa) e o ultimo leaf (contracapa) estao longe da janela [8..12],
    // mas continuam no DOM: a primeira face e capa e a ultima e contracapa.
    expect(kinds[0]).toBe("cover");
    expect(kinds[kinds.length - 1]).toBe("back-cover");
  });

  it("borda: windowRadius 0 aplica o piso 1 (o spread precisa de duas folhas)", () => {
    const floored = renderBook(10, { windowRadius: 0, initialLeaf: 1 }).mountedLeaves();
    const one = renderBook(10, { windowRadius: 1, initialLeaf: 1 }).mountedLeaves();
    expect(floored).toBe(one);
    // com o piso, o spread em leaf 1 mantem a folha da esquerda (0) e a direita (1)
    // montadas, alem da contracapa: nunca menos que essas.
    expect(floored).toBeGreaterThanOrEqual(3);
  });
});
