import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { PAGE_W } from "../constants";
import { PORTRAIT_QUERY, usePortraitFrame } from "../usePortraitFrame";

// T16 / MEDIA-08 AC1, MEDIA-09 AC3+AC4, MEDIA-10 AC5. Deriva dos criterios de
// aceite: dentro do spread o swipe alterna o lado enquadrado; passar do limite
// vira a folha (goTo) e reposiciona; o matchMedia off->on->off atualiza o retrato
// sem recarregar. O termo de enquadramento e 0 fora do retrato (desktop intacto).

// matchMedia controlavel (jsdom nao o implementa).
function installMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mq = {
    get matches() {
      return matches;
    },
    media: PORTRAIT_QUERY,
    onchange: null,
    addEventListener: (_type: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  window.matchMedia = ((_query: string) => mq) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

function makeViewport() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return { current: el } as { current: HTMLElement };
}

let originalMatchMedia: typeof window.matchMedia | undefined;

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
});

afterEach(() => {
  window.matchMedia = originalMatchMedia as typeof window.matchMedia;
  document.body.innerHTML = "";
});

describe("usePortraitFrame — gatilho matchMedia (MEDIA-10 AC5)", () => {
  it("off -> on -> off atualiza portrait sem recarregar", () => {
    const media = installMatchMedia(false);
    const ref = makeViewport();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo: vi.fn(), getLeaf: () => 0 }),
    );

    expect(result.current.portrait).toBe(false);
    media.set(true);
    expect(result.current.portrait).toBe(true);
    media.set(false);
    expect(result.current.portrait).toBe(false);
  });
});

describe("usePortraitFrame — swipe dentro do spread (MEDIA-09 AC3)", () => {
  it("alterna o enquadramento esquerda <-> direita sem virar a folha", () => {
    installMatchMedia(true);
    const ref = makeViewport();
    const goTo = vi.fn();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo, getLeaf: () => 3 }),
    );

    expect(result.current.frameSide).toBe("left");

    act(() => result.current.onSwipe(1)); // avanca dentro do spread
    expect(result.current.frameSide).toBe("right");
    expect(goTo).not.toHaveBeenCalled();

    act(() => result.current.onSwipe(-1)); // volta dentro do spread
    expect(result.current.frameSide).toBe("left");
    expect(goTo).not.toHaveBeenCalled();
  });
});

describe("usePortraitFrame — swipe alem do limite (MEDIA-09 AC4)", () => {
  it("avancar da pagina direita vira a folha seguinte e reposiciona a esquerda", () => {
    installMatchMedia(true);
    const ref = makeViewport();
    const goTo = vi.fn();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo, getLeaf: () => 3 }),
    );

    act(() => result.current.onSwipe(1)); // left -> right
    act(() => result.current.onSwipe(1)); // right -> limite: vira a folha
    expect(goTo).toHaveBeenCalledWith(4);
    expect(result.current.frameSide).toBe("left");
  });

  it("voltar da pagina esquerda vira a folha anterior e reposiciona a direita", () => {
    installMatchMedia(true);
    const ref = makeViewport();
    const goTo = vi.fn();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo, getLeaf: () => 3 }),
    );

    // comeca em "left"; voltar aqui e o limite inferior do spread
    act(() => result.current.onSwipe(-1));
    expect(goTo).toHaveBeenCalledWith(2);
    expect(result.current.frameSide).toBe("right");
  });
});

describe("usePortraitFrame — termo de enquadramento (AD-029 item 2)", () => {
  it("desloca meia pagina, com sinais opostos por lado, e some fora do retrato", () => {
    const media = installMatchMedia(true);
    const ref = makeViewport();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo: vi.fn(), getLeaf: () => 3 }),
    );

    // esquerda enquadrada: desloca o palco meia pagina para a direita (positivo).
    const left = result.current.frameOffset;
    expect(left).toBeCloseTo((result.current.scale * PAGE_W) / 2, 5);
    expect(left).toBeGreaterThan(0);

    act(() => result.current.onSwipe(1)); // enquadra a direita
    const right = result.current.frameOffset;
    expect(right).toBeCloseTo(-(result.current.scale * PAGE_W) / 2, 5);
    expect(right).toBe(-left);

    // desligar o retrato zera o enquadramento (desktop intacto).
    media.set(false);
    expect(result.current.portrait).toBe(false);
    expect(result.current.frameOffset).toBe(0);
  });

  it("um swipe por evento de toque no viewport aciona a alternancia", () => {
    installMatchMedia(true);
    const ref = makeViewport();
    const { result } = renderHook(() =>
      usePortraitFrame({ viewportRef: ref, goTo: vi.fn(), getLeaf: () => 3 }),
    );
    const el = ref.current;

    // arrastar para a esquerda (dx negativo) avanca: esquerda -> direita.
    act(() => {
      el.dispatchEvent(
        new TouchEvent("touchstart", { touches: [{ clientX: 300 } as Touch] }),
      );
      el.dispatchEvent(
        new TouchEvent("touchend", { changedTouches: [{ clientX: 200 } as Touch] }),
      );
    });
    expect(result.current.frameSide).toBe("right");
  });
});
