/**
 * `PublicAdapter` — leitura publica para a rota de compartilhamento `/s/:token` (2B).
 *
 * `canWrite=false`: RECUSA toda escrita com `WriteForbiddenError`. O flag desliga o
 * cromo de edicao no DOM antes mesmo de qualquer tentativa; a rejeicao e a segunda
 * barreira (DATA-03 AC4).
 *
 * Le por delegacao a uma `ReadSource` injetada — nos testes, um `LocalAdapter`
 * semeado; na 2B, o leitor da view `books_public` do Supabase. Nao conhece backend:
 * so sabe ler `getBook`/`assetUrl`.
 */

import type { AssetRef, AssetSize } from "../../book/schema";
import type { ProcessedImage } from "../../media/pipeline";
import {
  WriteForbiddenError,
  type AdapterName,
  type BookSummary,
  type CreateResult,
  type LoadedBook,
  type RevisionMeta,
  type SaveResult,
  type StorageAdapter,
} from "../StorageAdapter";

/** O que o `PublicAdapter` precisa da origem: apenas ler. */
export type ReadSource = Pick<StorageAdapter, "getBook" | "assetUrl">;

export class PublicAdapter implements StorageAdapter {
  readonly name: AdapterName = "public";
  readonly canWrite = false;

  constructor(private readonly source: ReadSource) {}

  getBook(id: string): Promise<LoadedBook | null> {
    return this.source.getBook(id);
  }

  assetUrl(ref: AssetRef, size?: AssetSize): string {
    return this.source.assetUrl(ref, size);
  }

  /** Um leitor anonimo nao tem estante nem historico publico: leituras vazias. */
  async listBooks(): Promise<BookSummary[]> {
    return [];
  }

  async listRevisions(_id: string): Promise<RevisionMeta[]> {
    return [];
  }

  async createBook(_doc: unknown): Promise<CreateResult> {
    throw new WriteForbiddenError();
  }

  async saveBook(_id: string, _doc: unknown, _rev: number): Promise<SaveResult> {
    throw new WriteForbiddenError();
  }

  async deleteBook(_id: string): Promise<void> {
    throw new WriteForbiddenError();
  }

  async restoreRevision(_id: string, _revisionId: string): Promise<SaveResult> {
    throw new WriteForbiddenError();
  }

  async uploadAsset(_bookId: string, _img: ProcessedImage): Promise<AssetRef> {
    throw new WriteForbiddenError();
  }

  async gcAssets(_id: string): Promise<void> {
    throw new WriteForbiddenError();
  }
}
