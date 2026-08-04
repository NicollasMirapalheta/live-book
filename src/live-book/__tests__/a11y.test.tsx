/**
 * Acessibilidade do leitor (LIB-07/08) — testes estruturais pela API pública.
 *
 * Derivados dos AC da spec da Fase 2B, não da implementação. Só o que jsdom mede
 * com sentido: presença de `aria-hidden`/`inert` e foco. Contraste de foco e alvo
 * de toque (LIB-07 AC2, LIB-08 AC5) são visuais — verificados no preview, não aqui.
 */

import { describe, it, expect } from "vitest";
import { renderBook } from "./renderBook";

/** Elementos que entram no tab order. Exclui `tabindex="-1"` de propósito. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Verdadeiro se `el` ou algum ancestral está escondido da árvore de a11y por
 * `aria-hidden="true"` ou por `inert`. */
function hiddenFromA11y(el: Element): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (cur.getAttribute("aria-hidden") === "true") return true;
    if (cur.hasAttribute("inert")) return true;
    cur = cur.parentElement;
  }
  return false;
}

describe("a11y do leitor (LIB-07)", () => {
  it("nenhum elemento focável está dentro de subárvore aria-hidden (LIB-07 AC1)", () => {
    const { container } = renderBook(8, { chapters: { 0: "Começando", 3: "Meio" } });
    const focusables = Array.from(container.querySelectorAll(FOCUSABLE));
    expect(focusables.length).toBeGreaterThan(0);
    // As fitas de capítulo (lb-tabs) eram botões focáveis dentro de aria-hidden.
    const dentroDeAriaHidden = focusables.filter((el) => {
      let cur: Element | null = el;
      while (cur) {
        if (cur.getAttribute("aria-hidden") === "true") return true;
        cur = cur.parentElement;
      }
      return false;
    });
    expect(dentroDeAriaHidden).toEqual([]);
  });

  it("as fitas de capítulo são focáveis e rotuladas (LIB-07 AC1)", () => {
    const { container } = renderBook(8, { chapters: { 0: "Começando", 3: "Meio" } });
    const tabs = Array.from(container.querySelectorAll(".lb-tabs__tab")) as HTMLElement[];
    expect(tabs.length).toBeGreaterThan(0);
    for (const tab of tabs) {
      expect(hiddenFromA11y(tab)).toBe(false);
      expect(tab.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("folhas montadas fora do spread são inert; as do spread não (LIB-07 AC1/AC3, AD-027)", () => {
    // Abrir num spread do miolo: folhas 4 e 5 são o spread; as demais montadas
    // (dentro da janela de virtualização) ficam ocluídas atrás dele.
    const { container } = renderBook(20, { initialLeaf: 5 });
    const leaves = Array.from(container.querySelectorAll(".lb-leaf"));
    expect(leaves.length).toBeGreaterThan(2); // a janela monta mais que o spread

    const inert = leaves.filter((l) => l.hasAttribute("inert"));
    const noSpread = leaves.filter((l) => !l.hasAttribute("inert"));

    // Exatamente o spread (as duas folhas visíveis) fica fora do inert;
    // toda folha montada e ocluída é inert (sai do tab order / da a11y).
    expect(noSpread.length).toBe(2);
    expect(inert.length).toBe(leaves.length - 2);
  });
});
