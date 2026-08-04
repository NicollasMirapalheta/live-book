import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Callout } from "../Callout";
import { Rule } from "../Rule";
import { Spacer } from "../Spacer";
import type { RenderCtx } from "../../RenderCtx";

const ctx = {} as RenderCtx;

describe("Callout", () => {
  it("respeita o tone na classe e renderiza o html", () => {
    const { container } = render(
      <Callout block={{ id: "c1", type: "callout", html: "<p>aviso</p>", tone: "warn", icon: "!" }} ctx={ctx} />,
    );
    const el = container.querySelector(".bk-callout");
    expect(el?.className).toContain("bk-callout--warn");
    expect(container.querySelector(".bk-callout__body")?.textContent).toBe("aviso");
    expect(container.querySelector(".bk-callout__icon")?.textContent).toBe("!");
  });

  it("tone ausente vira info", () => {
    const { container } = render(
      <Callout block={{ id: "c2", type: "callout", html: "x" }} ctx={ctx} />,
    );
    expect(container.querySelector(".bk-callout")?.className).toContain("bk-callout--info");
  });
});

describe("Rule", () => {
  it("renderiza um hr com a classe bk-rule", () => {
    const { container } = render(<Rule block={{ id: "r1", type: "rule" }} ctx={ctx} />);
    const hr = container.querySelector("hr.bk-rule");
    expect(hr).not.toBeNull();
  });
});

describe("Spacer", () => {
  it("size fill marca o espacador para ocupar o restante da pagina", () => {
    const { container } = render(
      <Spacer block={{ id: "s1", type: "spacer", size: "fill" }} ctx={ctx} />,
    );
    expect(container.querySelector(".bk-spacer")?.className).toContain("bk-spacer--fill");
  });

  it("size ausente vira md", () => {
    const { container } = render(<Spacer block={{ id: "s2", type: "spacer" }} ctx={ctx} />);
    expect(container.querySelector(".bk-spacer")?.className).toContain("bk-spacer--md");
  });
});
