/**
 * Ponto de entrada da camada de dados: escolhe o `StorageAdapter` por ambiente.
 *
 * Com `VITE_SUPABASE_URL` (e a anon key) presentes, usa o `SupabaseAdapter`; sem
 * elas, cai no `LocalAdapter` — o app sobe offline sem configurar backend
 * (DATA-01 AC5). A rota pública `/s/:token` (2B) usa o `PublicAdapter` à parte.
 *
 * `env` é injetável para teste; o default é `import.meta.env` (Vite).
 */

import { LocalAdapter } from "./local/LocalAdapter";
import { SupabaseAdapter } from "./supabase/SupabaseAdapter";
import { createSupabaseClient } from "./supabase/client";
import type { StorageAdapter } from "./StorageAdapter";

export * from "./StorageAdapter";

export interface RuntimeEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export function pickAdapter(
  env: RuntimeEnv = import.meta.env as unknown as RuntimeEnv,
): StorageAdapter {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    return new SupabaseAdapter(
      createSupabaseClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY),
      env.VITE_SUPABASE_URL,
    );
  }
  return new LocalAdapter();
}
