import { describe, it, expect } from "vitest";
import { renderBook } from "./renderBook";

// Caracterizacao da montagem de faces (FUND-05). Fixa o comportamento ATUAL do
// motor pela API publica, para o modo retrato da Fase 3 poder mexer no
// stageOffset sabendo na hora se algo regrediu. windowRadius alto monta o livro
// inteiro, para observar a sequencia completa de faces.

const FULL = 999;

describe("montagem de faces e folhas", () => {
  it("sequencia capa, guarda, N paginas, guarda, contracapa (N par)", () => {
    const book = renderBook(10, { windowRadius: FULL });
    expect(book.faceKinds()).toEqual([
      "cover",
      "endpaper",
      ...Array(10).fill("page"),
      "endpaper",
      "back-cover",
    ]);
  });

  it("nenhum enchimento quando o total de faces ja e par", () => {
    const book = renderBook(10, { windowRadius: FULL });
    expect(book.faceKinds().filter((k) => k === "blank")).toHaveLength(0);
  });

  it("insere exatamente uma face de enchimento quando o total seria impar", () => {
    const book = renderBook(5, { windowRadius: FULL });
    const kinds = book.faceKinds();
    expect(kinds.filter((k) => k === "blank")).toHaveLength(1);
    // o enchimento entra depois do miolo e antes da guarda final
    expect(kinds).toEqual([
      "cover",
      "endpaper",
      ...Array(5).fill("page"),
      "blank",
      "endpaper",
      "back-cover",
    ]);
  });

  it("leaves === faces.length / 2", () => {
    const book = renderBook(10, { windowRadius: FULL });
    expect(book.leaves()).toBe(book.faceKinds().length / 2);
  });

  it("borda: miolo com 0 paginas monta so a casca, leaves === 2", () => {
    const book = renderBook(0, { windowRadius: FULL });
    expect(book.faceKinds()).toEqual(["cover", "endpaper", "endpaper", "back-cover"]);
    expect(book.leaves()).toBe(2);
  });

  it("borda: miolo com 1 pagina recebe enchimento", () => {
    const book = renderBook(1, { windowRadius: FULL });
    expect(book.faceKinds().filter((k) => k === "blank")).toHaveLength(1);
  });
});
