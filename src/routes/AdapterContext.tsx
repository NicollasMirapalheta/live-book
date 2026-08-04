import { createContext, useContext, type ReactNode } from "react";
import type { StorageAdapter } from "../data/StorageAdapter";

/**
 * Injeção do `StorageAdapter` nas rotas. O app real alimenta com `pickAdapter()`
 * (wiring — T15); os testes injetam um `LocalAdapter` semeado ou um `PublicAdapter`.
 * As rotas NUNCA chamam `pickAdapter()` direto — só leem daqui, para o teste poder
 * substituir a fonte de dados.
 */
const AdapterContext = createContext<StorageAdapter | null>(null);

export function AdapterProvider({
  adapter,
  children,
}: {
  adapter: StorageAdapter;
  children: ReactNode;
}) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

export function useAdapter(): StorageAdapter {
  const adapter = useContext(AdapterContext);
  if (!adapter) {
    throw new Error("useAdapter: nenhum StorageAdapter no contexto (falta AdapterProvider).");
  }
  return adapter;
}
