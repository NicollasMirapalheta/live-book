import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { LiveBook, Page } from "../index";
import type { LiveBookApi } from "../types";

// Mudancas aditivas no motor (DOC-10). Nao mudam o comportamento existente — a
// caracterizacao da Fase 0 continua verde (rodada junto na suite).

const book = (extra: Record<string, unknown> = {}) => (
  <LiveBook title="t" sound={false} {...extra}>
    <Page>um</Page>
    <Page>dois</Page>
    <Page>tres</Page>
    <Page>quatro</Page>
  </LiveBook>
);

describe("prop style", () => {
  it("aplica custom properties no root sem sobrescrever --lb-cover-square", () => {
    const { container } = render(
      book({ style: { "--lb-accent": "#ff0000", "--lb-cover-square": "999px" } }),
    );
    const root = container.querySelector(".lb-root") as HTMLElement;
    expect(root.style.getPropertyValue("--lb-accent")).toBe("#ff0000");
    // o motor mantem cover-square em sincronia com BOARD_SQUARE — o consumidor nao a vence
    expect(root.style.getPropertyValue("--lb-cover-square")).toBe("26px");
  });
});

describe("prop apiRef", () => {
  it("expoe goTo, leaves e getLeaf", () => {
    const ref = createRef<LiveBookApi>();
    render(book({ apiRef: ref }));
    expect(ref.current).not.toBeNull();
    const api = ref.current as LiveBookApi;
    expect(typeof api.goTo).toBe("function");
    expect(typeof api.getLeaf).toBe("function");
    // 4 paginas de miolo -> faces = capa+guarda+4+guarda+contracapa = 8 -> 4 folhas
    expect(api.leaves).toBe(4);
    expect(api.getLeaf()).toBe(0);
  });

  it("goTo navega e getLeaf reflete a folha atual", () => {
    const ref = createRef<LiveBookApi>();
    render(book({ apiRef: ref }));
    const api = ref.current as LiveBookApi;
    act(() => api.goTo(2));
    expect(api.getLeaf()).toBe(2);
  });
});

describe("guarda de contentEditable no teclado", () => {
  it("com foco em [data-lb-nokeys], a seta nao vira a pagina", () => {
    const onLeafChange = vi.fn();
    const { container } = render(
      <LiveBook title="t" sound={false} onLeafChange={onLeafChange}>
        <Page>
          <div data-lb-nokeys>
            <span data-testid="editor" tabIndex={0}>
              editor
            </span>
          </div>
        </Page>
        <Page>dois</Page>
      </LiveBook>,
    );
    const target = container.querySelector('[data-testid="editor"]') as HTMLElement;
    fireEvent.keyDown(target, { key: "ArrowRight" });
    expect(onLeafChange).not.toHaveBeenCalled();
  });

  it("fora de um campo de escrita, a seta vira a pagina normalmente", () => {
    const onLeafChange = vi.fn();
    render(
      <LiveBook title="t" sound={false} onLeafChange={onLeafChange}>
        <Page>um</Page>
        <Page>dois</Page>
      </LiveBook>,
    );
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(onLeafChange).toHaveBeenCalledWith(1);
  });
});
