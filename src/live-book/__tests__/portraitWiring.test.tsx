import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { LiveBook, Page } from "../index";
import type { LiveBookApi } from "../types";
import { PORTRAIT_QUERY } from "../usePortraitFrame";

// T17 / MEDIA-09 AC2 + MEDIA-10 AC6/AC7. Verifica a LIGACAO do retrato ao motor
// pela API publica: a virada 3D continua ocorrendo em retrato igual ao desktop; o
// swipe no viewport vira a folha pelo goTo real; e a virtualizacao (faces/angles/
// inWindow) e identica com o retrato ligado ou desligado — o motor fica intacto.
// A caracterizacao da Fase 0 (MEDIA-10 AC6) roda na mesma suite e permanece verde.

function installMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const mq = {
    get matches() {
      return matches;
    },
    media: PORTRAIT_QUERY,
    onchange: null,
    addEventListener: (_t: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_t: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  window.matchMedia = ((_q: string) => mq) as unknown as typeof window.matchMedia;
}

function book(ref: React.Ref<LiveBookApi>, onLeafChange?: (leaf: number) => void) {
  return (
    <LiveBook
      title="t"
      sound={false}
      apiRef={ref}
      onLeafChange={onLeafChange}
      cover={<div>capa</div>}
      backCover={<div>contracapa</div>}
    >
      <Page>um</Page>
      <Page>dois</Page>
      <Page>tres</Page>
      <Page>quatro</Page>
      <Page>cinco</Page>
      <Page>seis</Page>
    </LiveBook>
  );
}

let originalMatchMedia: typeof window.matchMedia | undefined;
beforeEach(() => {
  originalMatchMedia = window.matchMedia;
});
afterEach(() => {
  // jsdom nao tem matchMedia — restaurar (undefined = desktop) para os outros testes.
  window.matchMedia = originalMatchMedia as typeof window.matchMedia;
  document.body.innerHTML = "";
});

describe("LiveBook em retrato — virada preservada (MEDIA-09 AC2)", () => {
  it("as folhas montam e navegar vira a folha, igual ao desktop", () => {
    installMatchMedia(true);
    const ref = createRef<LiveBookApi>();
    const onLeafChange = vi.fn();
    const { container } = render(book(ref, onLeafChange));

    // a estrutura da virada 3D (folhas com duas faces) esta montada.
    expect(container.querySelectorAll(".lb-leaf").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".lb-face--front").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".lb-face--back").length).toBeGreaterThan(0);

    // virar avanca a folha e reporta o destino — mesmo mecanismo do desktop.
    act(() => ref.current!.goTo(2));
    expect(ref.current!.getLeaf()).toBe(2);
    expect(onLeafChange).toHaveBeenCalledWith(2);
  });

  it("swipe no viewport vira a folha pelo goTo real (ligacao ponta a ponta)", () => {
    installMatchMedia(true);
    const ref = createRef<LiveBookApi>();
    const onLeafChange = vi.fn();
    const { container } = render(book(ref, onLeafChange));
    const vp = container.querySelector(".lb-viewport") as HTMLElement;

    const swipeForward = () =>
      act(() => {
        vp.dispatchEvent(
          new TouchEvent("touchstart", { touches: [{ clientX: 300 } as Touch] }),
        );
        vp.dispatchEvent(
          new TouchEvent("touchend", { changedTouches: [{ clientX: 200 } as Touch] }),
        );
      });

    // comeca em leaf 0, lado esquerdo. 1o swipe: esquerda->direita (nao vira).
    swipeForward();
    expect(onLeafChange).not.toHaveBeenCalled();
    // 2o swipe: passa do limite -> vira para a folha 1.
    swipeForward();
    expect(onLeafChange).toHaveBeenCalledWith(1);
    expect(ref.current!.getLeaf()).toBe(1);
  });
});

describe("LiveBook — retrato nao altera a virtualizacao (MEDIA-10 AC6/AC7)", () => {
  it("as mesmas folhas montam com o retrato ligado e desligado", () => {
    // desktop: sem matchMedia (jsdom padrao).
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const desktop = render(book(createRef<LiveBookApi>()));
    const desktopLeaves = desktop.container.querySelectorAll(".lb-leaf").length;
    const desktopFaces = desktop.container.querySelectorAll(".lb-page").length;
    desktop.unmount();

    // retrato ligado.
    installMatchMedia(true);
    const portrait = render(book(createRef<LiveBookApi>()));
    const portraitLeaves = portrait.container.querySelectorAll(".lb-leaf").length;
    const portraitFaces = portrait.container.querySelectorAll(".lb-page").length;

    // faces/angles/inWindow intactos: a janela de virtualizacao e identica.
    expect(portraitLeaves).toBe(desktopLeaves);
    expect(portraitFaces).toBe(desktopFaces);
  });
});
