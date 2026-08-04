/**
 * Autorização do `SupabaseAdapter` — caminho NEGATIVO (DATA-04), ao vivo.
 *
 * O contrato geral cobre o caminho feliz (sempre com token válido). Estes testes
 * fecham as duas lacunas apontadas na validação independente: um save sem o token
 * certo é RECUSADO (AC1), e a leitura pública não expõe o `edit_token` (AC2). São
 * garantias de segurança da história P1 "autorização sem login".
 *
 * Opt-in como o contrato: pulado sem SUPABASE_TEST_URL. Requer o schema aplicado.
 */

import { describe, it, expect, afterAll } from "vitest";
import { createEmptyDoc, createPage, createBlock } from "../../../book/factory";
import type { BookDoc } from "../../../book/schema";
import { getEditToken, setEditToken, clearEditToken } from "../../editTokens";
import { SupabaseAdapter } from "../SupabaseAdapter";
import { createSupabaseClient } from "../client";

// tsconfig do app é browser-only; este teste roda em Node (vitest).
declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_ANON_KEY;

function doc(title: string): BookDoc {
  return createEmptyDoc({
    title,
    surface: "manuscript",
    pages: [createPage({ blocks: [createBlock("text", { html: `<p>${title}</p>` })] })],
  });
}

if (url && key) {
  const make = () => new SupabaseAdapter(createSupabaseClient(url, key), url);

  describe("SupabaseAdapter — autorização, caminho negativo (DATA-04, ao vivo)", () => {
    it("save com edit_token errado é recusado e não altera o estado (DATA-04 AC1)", async () => {
      const adapter = make();
      const original = doc("original");
      const { id, rev } = await adapter.createBook(original);
      const realToken = getEditToken(id)!;

      // quem tem o id mas não o token certo: troca o token local por um errado.
      setEditToken(id, "token-errado-nao-confere");
      await expect(adapter.saveBook(id, doc("invasor"), rev)).rejects.toThrow();

      // sem token nenhum, o guard do cliente também recusa.
      clearEditToken(id);
      await expect(adapter.saveBook(id, doc("invasor"), rev)).rejects.toThrow();

      // nada foi sobrescrito: rev e doc intactos (restaura o token para poder ler/apagar).
      setEditToken(id, realToken);
      const loaded = await adapter.getBook(id);
      expect(loaded!.rev).toBe(rev);
      expect(loaded!.doc).toEqual(original);
    });

    it("a leitura pública não expõe edit_token nem owner_id (DATA-04 AC2)", async () => {
      const adapter = make();
      const { id } = await adapter.createBook(doc("publico"));

      const client = createSupabaseClient(url, key);
      const { data, error } = await client
        .from("books_public")
        .select("*")
        .eq("id", id)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      const keys = Object.keys(data as Record<string, unknown>);
      expect(keys).not.toContain("edit_token");
      expect(keys).not.toContain("owner_id");
    });
  });

  // Limpa os volumes criados por estes testes (os que têm edit_token local).
  afterAll(async () => {
    const adapter = make();
    const PREFIX = "lb.editToken.";
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const storageKey = localStorage.key(i);
      if (!storageKey?.startsWith(PREFIX)) continue;
      const id = storageKey.slice(PREFIX.length);
      try {
        await adapter.deleteBook(id);
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  });
} else {
  describe.skip("SupabaseAdapter — autorização (DATA-04) — SUPABASE_TEST_URL ausente", () => {
    it("pulado sem credenciais de teste ao vivo", () => {});
  });
}
