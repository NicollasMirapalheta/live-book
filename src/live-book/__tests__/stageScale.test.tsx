import { afterEach, describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { useStageScale } from "../useStageScale";
import { BOARD_SQUARE, PAGE_H, PAGE_W, STAGE_W } from "../constants";

// T15 / MEDIA-08 AC1 + MEDIA-10 AC7. A escala do palco em retrato deve deixar UMA
// pagina legivel no celular (>=320px em 390x844); com o retrato desligado o valor
// deve ser identico ao anterior (desktop inalterado). Os testes derivam dos
// criterios de aceite, nao da implementacao: exercitam a saida do hook (a escala)
// sob viewports concretos.
//
// jsdom nao faz layout: getBoundingClientRect devolve zeros, entao o `measure`
// interno e no-op e o valor observado e a ESTIMATIVA inicial, derivada de
// window.innerWidth/innerHeight — que e onde configuramos cada viewport.

const original = { w: window.innerWidth, h: window.innerHeight };

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true, writable: true });
}

afterEach(() => {
  setViewport(original.w, original.h);
});

describe("useStageScale — modo retrato (AD-029)", () => {
  it("em 390x844 com portrait, a pagina exibida tem ao menos 320px de largura (MEDIA-08 AC1)", () => {
    setViewport(390, 844);
    const ref = createRef<HTMLElement>();
    const { result } = renderHook(() => useStageScale(ref, { portrait: true }));
    // largura exibida de uma pagina = PAGE_W * escala.
    expect(result.current * PAGE_W).toBeGreaterThanOrEqual(320);
  });

  it("no mesmo viewport 390x844, o retrato amplia a pagina alem do modo spread", () => {
    setViewport(390, 844);
    const ref = createRef<HTMLElement>();
    const spread = renderHook(() => useStageScale(ref)).result.current;
    const portrait = renderHook(() => useStageScale(ref, { portrait: true })).result.current;
    // escalar por uma pagina em vez do spread inteiro produz uma escala maior.
    expect(portrait).toBeGreaterThan(spread);
    // e so o retrato cruza o piso de legibilidade de 320px.
    expect(spread * PAGE_W).toBeLessThan(320);
    expect(portrait * PAGE_W).toBeGreaterThanOrEqual(320);
  });

  it("com portrait ausente/false, a escala e byte-identica a formula desktop anterior (MEDIA-10 AC7)", () => {
    setViewport(1440, 900);
    const ref = createRef<HTMLElement>();
    // Formula desktop anterior (useStageScale.ts pre-Fase-3): margem 104,
    // caixa = spread + 2*sobra da capa, descontando o chrome (120x150).
    const BOOK_W = STAGE_W + 2 * BOARD_SQUARE;
    const BOOK_H = PAGE_H + 2 * BOARD_SQUARE;
    const expected = Math.max(
      0.25,
      Math.min(1, (1440 - 104 - 120) / BOOK_W, (900 - 104 - 150) / BOOK_H),
    );

    const absent = renderHook(() => useStageScale(ref)).result.current;
    const off = renderHook(() => useStageScale(ref, { portrait: false })).result.current;

    expect(absent).toBe(expected);
    expect(off).toBe(expected);
  });
});
