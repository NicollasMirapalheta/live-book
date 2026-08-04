/**
 * Seleção de adapter por ambiente (DATA-01 AC5).
 *
 * Derivado do AC: sem `VITE_SUPABASE_URL` o app DEVE subir no `LocalAdapter` sem
 * erro. Testa também o caminho positivo e o meio-termo (URL sem key).
 */

import { describe, it, expect } from "vitest";
import { pickAdapter } from "../index";
import { LocalAdapter } from "../local/LocalAdapter";
import { SupabaseAdapter } from "../supabase/SupabaseAdapter";

describe("pickAdapter", () => {
  it("sem VITE_SUPABASE_URL, cai no LocalAdapter (DATA-01 AC5)", () => {
    expect(pickAdapter({})).toBeInstanceOf(LocalAdapter);
  });

  it("com URL vazia, ainda cai no LocalAdapter", () => {
    expect(
      pickAdapter({ VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" }),
    ).toBeInstanceOf(LocalAdapter);
  });

  it("com URL e anon key, usa o SupabaseAdapter", () => {
    const adapter = pickAdapter({
      VITE_SUPABASE_URL: "https://exemplo.supabase.co",
      VITE_SUPABASE_ANON_KEY: "sb_publishable_teste",
    });
    expect(adapter).toBeInstanceOf(SupabaseAdapter);
  });

  it("com URL mas sem anon key, cai no LocalAdapter (config incompleta)", () => {
    expect(
      pickAdapter({ VITE_SUPABASE_URL: "https://exemplo.supabase.co" }),
    ).toBeInstanceOf(LocalAdapter);
  });
});
