/**
 * Cliente do Supabase — o ÚNICO ponto onde `@supabase/supabase-js` é importado
 * (invariante: nenhum import do SDK fora de `src/data/supabase/`).
 *
 * `createSupabaseClient(url, key)` recebe as credenciais explicitamente para ser
 * testável (o contrato ao vivo injeta credenciais de teste); a seleção por env
 * (`import.meta.env`) mora em `src/data/index.ts` (pickAdapter), não aqui.
 *
 * Sem sessão de auth na v1 (acesso por token de edição, não por login), então o
 * cliente não persiste nem atualiza sessão.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
