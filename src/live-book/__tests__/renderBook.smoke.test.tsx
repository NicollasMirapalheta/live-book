import { describe, it, expect } from "vitest";
import { renderBook } from "./renderBook";

// Smoke do proprio helper: se montar o LiveBook lancar (ex.: ResizeObserver
// ausente), isto quebra antes de qualquer caracterizacao, apontando o ambiente.
describe("renderBook (helper de caracterizacao)", () => {
  it("monta o LiveBook com N paginas e expoe consultas ao DOM", () => {
    const book = renderBook(10, { windowRadius: 10 });
    expect(book.container.querySelector(".lb-root")).not.toBeNull();
    expect(book.mountedLeaves()).toBeGreaterThan(0);
    expect(book.faceKinds().length).toBeGreaterThan(0);
  });
});
