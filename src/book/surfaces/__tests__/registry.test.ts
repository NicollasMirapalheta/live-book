import { describe, it, expect } from "vitest";
import {
  blockTableFor,
  getSurface,
  listSurfaces,
  registerSurface,
  type SurfaceDef,
} from "../registry";
import type { BlockRenderProps } from "../../RenderCtx";

const Special = (_props: BlockRenderProps) => null;

const makeSurface = (id: string, blocks?: SurfaceDef["blocks"]): SurfaceDef => ({
  id,
  label: id,
  layouts: [],
  theme: { accent: "#123456" },
  defaultWindowRadius: 2,
  blocks,
});

describe("registry de surfaces", () => {
  it("registerSurface + getSurface devolve a surface registrada", () => {
    const surface = makeSurface("reg-a");
    registerSurface(surface);
    expect(getSurface("reg-a")).toBe(surface);
    expect(listSurfaces().map((s) => s.id)).toContain("reg-a");
  });

  it("surface nao registrada devolve fallback com blocos de nucleo e sem tema, sem lancar", () => {
    let fallback: SurfaceDef | undefined;
    expect(() => {
      fallback = getSurface("nao-existe");
    }).not.toThrow();
    expect(fallback?.theme).toEqual({});
    const table = blockTableFor("nao-existe");
    expect(table.heading).toBeDefined();
    expect(table.text).toBeDefined();
  });

  it("blocos de nucleo disponiveis para toda surface sem registro", () => {
    registerSurface(makeSurface("reg-core"));
    const table = blockTableFor("reg-core");
    for (const type of ["heading", "text", "quote", "callout", "rule", "spacer", "image", "gallery"]) {
      expect(table[type]).toBeDefined();
    }
  });

  it("blockTableFor memoiza por surfaceId — mesma referencia em chamadas repetidas", () => {
    registerSurface(makeSurface("reg-memo"));
    expect(blockTableFor("reg-memo")).toBe(blockTableFor("reg-memo"));
  });

  it("blocos exclusivos ficam disponiveis so para a surface que os registra", () => {
    registerSurface(makeSurface("reg-x", { special: Special }));
    registerSurface(makeSurface("reg-y"));
    expect(blockTableFor("reg-x").special).toBe(Special);
    expect(blockTableFor("reg-y").special).toBeUndefined();
  });

  it("re-registrar invalida a tabela memoizada", () => {
    registerSurface(makeSurface("reg-inv"));
    const before = blockTableFor("reg-inv");
    registerSurface(makeSurface("reg-inv", { special: Special }));
    const after = blockTableFor("reg-inv");
    expect(after).not.toBe(before);
    expect(after.special).toBe(Special);
  });
});
