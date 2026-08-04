import { describe, it, expect } from "vitest";
import { manuscript } from "../index";
import { blockTableFor, getSurface } from "../../registry";
import { themeToVars } from "../../../schema";

describe("surface manuscript", () => {
  it("registra-se com theme, layouts e defaultWindowRadius", () => {
    expect(getSurface("manuscript")).toBe(manuscript);
    expect(manuscript.layouts.length).toBeGreaterThan(0);
    expect(typeof manuscript.defaultWindowRadius).toBe("number");
    expect(manuscript.defaultWindowRadius).toBe(4);
  });

  it("o theme traduz para custom properties --lb-*", () => {
    const vars = themeToVars(manuscript.theme);
    expect(vars["--lb-accent"]).toBe("#7a55d1");
    expect(vars["--lb-paper"]).toBe("#fdfbf6");
    expect(vars["--lb-bg"]).toBe("#efe9dd");
  });

  it("nao tem bloco exclusivo — usa so o nucleo (8 blocos)", () => {
    expect(manuscript.blocks).toBeUndefined();
    expect(Object.keys(blockTableFor("manuscript")).sort()).toEqual(
      ["callout", "gallery", "heading", "image", "quote", "rule", "spacer", "text"].sort(),
    );
  });
});
