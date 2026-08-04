import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PublicAdapter } from "../data/public/PublicAdapter";
import { useAdapter } from "./AdapterContext";
import { ReaderShell } from "./ReaderRoute";

/**
 * Leitor público de um link compartilhado (`/s/:token`, LIB-01 AC6 / LIB-03).
 *
 * O `:token` é o id do volume — o uuid É o segredo (`AD-004/013`); a v1 não tem
 * coluna de share-token separada. A leitura passa por um `PublicAdapter`, cujo
 * `canWrite=false` é a ÚNICA chave: monta o mesmo `ReaderShell`, só que sem nenhum
 * cromo de edição. Nada de `if (surface)` nem de bifurcação espalhada.
 *
 * A fonte de leitura vem do contexto (no app, o leitor Supabase de `books_public`;
 * nos testes, um `LocalAdapter` semeado) e é envolvida aqui num `PublicAdapter`.
 */
export function ShareRoute() {
  const { token } = useParams();
  const source = useAdapter();
  const publicAdapter = useMemo(() => new PublicAdapter(source), [source]);
  return <ReaderShell adapter={publicAdapter} id={token ?? ""} />;
}
