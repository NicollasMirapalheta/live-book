/**
 * Contrato do `SupabaseAdapter` (DATA-01) rodando AO VIVO contra um projeto real.
 *
 * Opt-in: sem `SUPABASE_TEST_URL`/`SUPABASE_TEST_ANON_KEY` no ambiente, é PULADO
 * (não falha) — assim `npm test` normal fica offline e rápido. Para rodar ao vivo:
 *
 *   SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… npm test src/data/supabase
 *
 * Requer o `schema.sql` aplicado no projeto. Cada teste cria volumes reais; o
 * `afterAll` apaga tudo que esta execução criou (todo id com edit_token local).
 */

import { describe, it, afterAll } from "vitest";
import { runAdapterContract } from "../../__tests__/adapter.contract";
import { SupabaseAdapter } from "../SupabaseAdapter";
import { createSupabaseClient } from "../client";

// O tsconfig do app é browser-only (sem @types/node). Este teste roda em Node
// (vitest), onde `process` existe em runtime; declaração type-only, escopada ao
// arquivo, para não puxar tipos de Node para o app.
declare const process: { env: Record<string, string | undefined> };

const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_ANON_KEY;

if (url && key) {
  runAdapterContract("supabase (ao vivo)", async () => new SupabaseAdapter(createSupabaseClient(url, key), url));

  // Limpeza: apaga cada volume cujo edit_token esta guardado localmente — ou seja,
  // exatamente os que esta execução criou. Não toca em volumes pré-existentes.
  afterAll(async () => {
    const adapter = new SupabaseAdapter(createSupabaseClient(url, key), url);
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
  describe.skip("StorageAdapter (contrato): supabase (ao vivo) — SUPABASE_TEST_URL ausente", () => {
    it("pulado sem credenciais de teste ao vivo", () => {});
  });
}
