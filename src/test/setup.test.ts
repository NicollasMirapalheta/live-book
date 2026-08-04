import { describe, it, expect } from "vitest";

// Teste-sentinela: prova que o stub de ambiente do setup.ts esta ativo. Se o
// setup deixar de carregar (ou o stub for removido), estes testes falham antes
// de qualquer suite de componente quebrar por um motivo mais obscuro.
describe("setup de ambiente de teste", () => {
  it("expoe ResizeObserver com observe/unobserve/disconnect", () => {
    expect(typeof ResizeObserver).toBe("function");
    const ro = new ResizeObserver(() => {});
    const el = document.createElement("div");
    expect(() => {
      ro.observe(el);
      ro.unobserve(el);
      ro.disconnect();
    }).not.toThrow();
  });

  it("nao stuba AudioContext — usePageSound degrada sozinho", () => {
    // A ausencia e intencional (ver setup.ts). Fixar isso impede que alguem
    // adicione um stub de AudioContext achando que resolve um problema.
    expect((globalThis as { AudioContext?: unknown }).AudioContext).toBeUndefined();
  });
});
