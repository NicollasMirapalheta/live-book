#!/usr/bin/env node
/**
 * Verificador de RLS (DATA-05 AC5).
 *
 * Conecta como `anon` e assegura que as SEIS operações de escrita proibidas
 * falham: insert/update/delete em `books` e as três em `book_revisions`. A tabela
 * revoga toda escrita de `anon` (schema.sql) — a única porta de escrita são as
 * RPCs. Se qualquer uma das seis passar, a autorização vazou; sai com código != 0.
 *
 * Uso (com o schema.sql já aplicado no projeto):
 *   node scripts/check-rls.mjs
 * Lê as credenciais de SUPABASE_TEST_URL/ANON_KEY ou, na ausência, de VITE_* no .env.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Fallback: carrega o .env local se as variáveis não estiverem no ambiente.
try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // sem .env — segue com o que houver no ambiente
}

const url = process.env.SUPABASE_TEST_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_TEST_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("check-rls: faltam SUPABASE_TEST_URL/ANON_KEY (ou VITE_* no .env).");
  process.exit(2);
}

const anon = createClient(url, key, { auth: { persistSession: false } });
const FAKE_ID = "00000000-0000-0000-0000-000000000000";

const forbidden = [
  ["books · insert", () => anon.from("books").insert({ doc: {}, title: "x", surface: "manuscript" })],
  ["books · update", () => anon.from("books").update({ title: "x" }).eq("id", FAKE_ID)],
  ["books · delete", () => anon.from("books").delete().eq("id", FAKE_ID)],
  ["book_revisions · insert", () => anon.from("book_revisions").insert({ book_id: FAKE_ID, doc: {}, rev: 1 })],
  ["book_revisions · update", () => anon.from("book_revisions").update({ rev: 2 }).eq("id", FAKE_ID)],
  ["book_revisions · delete", () => anon.from("book_revisions").delete().eq("id", FAKE_ID)],
];

let vazaram = 0;
for (const [nome, op] of forbidden) {
  const { error } = await op();
  if (error) {
    console.log(`  ✓ recusada: ${nome}  [${error.code ?? "?"}] ${error.message}`);
  } else {
    console.error(`  ✗ PERMITIDA (deveria falhar): ${nome}`);
    vazaram += 1;
  }
}

if (vazaram > 0) {
  console.error(`\ncheck-rls: ${vazaram} de 6 operações proibidas NÃO falharam — RLS vazou.`);
  process.exit(1);
}

console.log("\ncheck-rls: as 6 operações proibidas foram recusadas. RLS ok.");
