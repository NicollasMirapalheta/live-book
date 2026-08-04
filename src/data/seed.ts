/**
 * Semente de desenvolvimento offline.
 *
 * Sem backend (LocalAdapter), a estante começaria vazia e não haveria o que ler.
 * Semear o `demoDoc` no primeiro boot dá conteúdo para exercitar o app em dev.
 * No Supabase é **no-op** — não poluímos a biblioteca real do autor.
 */

import type { StorageAdapter } from "./StorageAdapter";
import { demoDoc } from "../demo/demoDoc";

export async function seedDemoIfEmpty(adapter: StorageAdapter): Promise<void> {
  if (adapter.name !== "local") return; // só em dev offline
  const books = await adapter.listBooks();
  if (books.length > 0) return; // já há conteúdo
  await adapter.createBook(demoDoc);
}
