/**
 * T11 — surface album, esqueleto e registro (MEDIA-06 AC1/AC5). Done-when:
 *  - album abre com tema proprio, margens estreitas e defaultWindowRadius=2
 *  - registrar album NAO exige alterar nenhum arquivo existente (AC5)
 *
 * A prova de AC5 e que album entra pelo MESMO caminho generico do manuscript:
 * `registerSurface` + `blockTableFor` (nucleo ∪ blocks). O registry/renderer nao
 * ganham ramo album — a tabela de blocos do album ainda contem os 8 de nucleo.
 */
import { describe, it, expect } from "vitest";
import { album } from "../index";
import "../../manuscript"; // manuscript segue registrado ao lado (nada quebra)
import { blockTableFor, getSurface, listSurfaces } from "../../registry";
import { themeToVars } from "../../../schema";

describe("surface album — esqueleto e tema (MEDIA-06 AC1)", () => {
  it("registra-se com tema proprio, margens estreitas e defaultWindowRadius=2", () => {
    expect(getSurface("album")).toBe(album);
    // AD-014: com foto, raio 2 (<=10 faces montadas)
    expect(album.defaultWindowRadius).toBe(2);
    // margens estreitas
    expect(album.chrome?.margin).toBe("tight");
  });

  it("o tema do album traduz para custom properties --lb-* proprias (distinto do manuscript)", () => {
    const vars = themeToVars(album.theme);
    expect(vars["--lb-accent"]).toBe("#b5622a");
    // papel PROPRIO e neutro, para nao tingir as fotos — distinto do papel creme do
    // manuscript (a distincao do tema mora aqui, nao no accent, que ambos compartilham)
    expect(vars["--lb-paper"]).toBe("#fffdf9");
    expect(vars["--lb-paper"]).not.toBe("#faf3e2");
  });
});

describe("surface album — registro aditivo (MEDIA-06 AC5)", () => {
  it("registrar album nao remove manuscript nem exige ramo no registry", () => {
    const ids = listSurfaces().map((s) => s.id);
    expect(ids).toContain("album");
    expect(ids).toContain("manuscript");
  });

  it("a tabela de blocos do album e nucleo ∪ blocks — os 8 de nucleo continuam disponiveis", () => {
    const table = blockTableFor("album");
    for (const core of ["heading", "text", "quote", "callout", "rule", "spacer", "image", "gallery"]) {
      expect(table[core]).toBeDefined();
    }
  });
});
