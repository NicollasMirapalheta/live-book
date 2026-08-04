import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getEditToken,
  setEditToken,
  clearEditToken,
  encodeRescue,
  decodeRescue,
} from "../editTokens";

// Testes de token de edicao + link de resgate (T4; DATA-06, AD-017). Derivam dos
// done-when: round-trip set->get->clear por id; encode/decode restauram o token;
// token no fragmento (nunca query string); localStorage indisponivel lanca erro.

describe("editTokens — localStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("round-trip set -> get -> clear por id (DATA-06)", () => {
    expect(getEditToken("b1")).toBeNull();
    setEditToken("b1", "tok-1");
    expect(getEditToken("b1")).toBe("tok-1");
    clearEditToken("b1");
    expect(getEditToken("b1")).toBeNull();
  });

  it("guarda tokens independentes por id de volume", () => {
    setEditToken("b1", "tok-1");
    setEditToken("b2", "tok-2");
    expect(getEditToken("b1")).toBe("tok-1");
    expect(getEditToken("b2")).toBe("tok-2");
    clearEditToken("b1");
    expect(getEditToken("b1")).toBeNull();
    expect(getEditToken("b2")).toBe("tok-2");
  });

  it("localStorage indisponivel lanca erro explicito, nao falha em silencio (edge case)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => setEditToken("b1", "tok")).toThrow(/localStorage indisponivel/);
    expect(() => getEditToken("b1")).toThrow(/localStorage indisponivel/);
    expect(() => clearEditToken("b1")).toThrow(/localStorage indisponivel/);
  });
});

describe("editTokens — link de resgate", () => {
  it("encodeRescue -> decodeRescue restaura id e token (DATA-06 AC1, AC2)", () => {
    const link = encodeRescue("book-42", "9f1c-uuid-token");
    expect(decodeRescue(link)).toEqual({ id: "book-42", token: "9f1c-uuid-token" });
  });

  it("o token viaja no fragmento, nunca em query string (privacidade)", () => {
    const link = encodeRescue("book-42", "9f1c-uuid-token");
    expect(link.startsWith("#")).toBe(true);
    expect(link).toContain("9f1c-uuid-token");
    expect(link).not.toContain("?");
  });

  it("decodeRescue de um fragmento sem token devolve null", () => {
    expect(decodeRescue("#algo=irrelevante")).toBeNull();
    expect(decodeRescue("")).toBeNull();
  });
});
