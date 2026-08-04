/**
 * `LocalAdapter` — implementacao do `StorageAdapter` sobre IndexedDB (via `idb`).
 *
 * Existe para (a) desenvolver offline sem configurar backend e (b) provar que a
 * interface NAO vazou detalhe de Postgres: mesma semantica de `rev`/conflito/
 * historico, escrita junto do resto, nao depois. Roda o contrato inteiro
 * (`runAdapterContract`) verde.
 *
 * `assetUrl` devolve `ref.id` por identidade — a resolucao real de blob e da Fase 3.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { MAX_DOC_BYTES, MAX_PAGES, REVISION_CAP } from "../../config/limits";
import type { AssetRef, BookDoc } from "../../book/schema";
import {
  NotFoundError,
  RevConflictError,
  TooLargeError,
  type AdapterName,
  type BookSummary,
  type CreateResult,
  type LoadedBook,
  type RevisionMeta,
  type SaveResult,
  type StorageAdapter,
} from "../StorageAdapter";

interface BookRecord {
  id: string;
  doc: BookDoc;
  rev: number;
  editToken: string;
  visibility: "private" | "link";
  createdAt: string;
  updatedAt: string;
}

interface RevisionRecord {
  id: string;
  bookId: string;
  doc: BookDoc;
  /** o `rev` que esta revisao arquivou; estritamente crescente, serve de ordenacao. */
  rev: number;
  createdAt: string;
}

interface LiveBookDB extends DBSchema {
  books: { key: string; value: BookRecord };
  revisions: { key: string; value: RevisionRecord; indexes: { by_book: string } };
}

/** Rejeita, sem tocar em estado, um doc acima dos limites (`TooLargeError`). Puro:
 * roda ANTES de qualquer transacao, para o save recusado nao alterar nada. */
function assertWithinLimits(doc: BookDoc): void {
  if (doc.pages.length > MAX_PAGES) throw new TooLargeError();
  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (bytes > MAX_DOC_BYTES) throw new TooLargeError();
}

export class LocalAdapter implements StorageAdapter {
  readonly name: AdapterName = "local";
  readonly canWrite = true;

  private dbPromise: Promise<IDBPDatabase<LiveBookDB>> | null = null;

  constructor(private readonly dbName = "live-book") {}

  private db(): Promise<IDBPDatabase<LiveBookDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<LiveBookDB>(this.dbName, 1, {
        upgrade(db) {
          db.createObjectStore("books", { keyPath: "id" });
          const revs = db.createObjectStore("revisions", { keyPath: "id" });
          revs.createIndex("by_book", "bookId");
        },
      });
    }
    return this.dbPromise;
  }

  async createBook(doc: BookDoc): Promise<CreateResult> {
    assertWithinLimits(doc);
    const now = new Date().toISOString();
    const record: BookRecord = {
      id: crypto.randomUUID(),
      doc,
      rev: 1,
      editToken: crypto.randomUUID(),
      visibility: "link",
      createdAt: now,
      updatedAt: now,
    };
    const db = await this.db();
    await db.add("books", record);
    return { id: record.id, rev: record.rev, editToken: record.editToken };
  }

  async getBook(id: string): Promise<LoadedBook | null> {
    const book = await (await this.db()).get("books", id);
    if (!book) return null;
    return { doc: book.doc, rev: book.rev };
  }

  async saveBook(id: string, doc: BookDoc, rev: number): Promise<SaveResult> {
    assertWithinLimits(doc);
    const db = await this.db();
    const tx = db.transaction(["books", "revisions"], "readwrite");
    const books = tx.objectStore("books");
    const revisions = tx.objectStore("revisions");

    const book = await books.get(id);
    if (!book) throw new NotFoundError();
    // Conflito ANTES de qualquer escrita: nunca vira sobrescrita silenciosa.
    if (book.rev !== rev) throw new RevConflictError();

    // Arquiva a versao atual antes de sobrescrever.
    const now = new Date().toISOString();
    await revisions.add({
      id: crypto.randomUUID(),
      bookId: id,
      doc: book.doc,
      rev: book.rev,
      createdAt: now,
    });

    // Poda para REVISION_CAP na MESMA transacao (as mais antigas por `rev`).
    const all = await revisions.index("by_book").getAll(id);
    if (all.length > REVISION_CAP) {
      const excedente = all.sort((a, b) => a.rev - b.rev).slice(0, all.length - REVISION_CAP);
      for (const old of excedente) await revisions.delete(old.id);
    }

    const next = book.rev + 1;
    await books.put({ ...book, doc, rev: next, updatedAt: now });
    await tx.done;
    return { rev: next };
  }

  async deleteBook(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(["books", "revisions"], "readwrite");
    await tx.objectStore("books").delete(id);
    const revStore = tx.objectStore("revisions");
    const owned = await revStore.index("by_book").getAllKeys(id);
    for (const key of owned) await revStore.delete(key);
    await tx.done;
  }

  async listBooks(): Promise<BookSummary[]> {
    const books = await (await this.db()).getAll("books");
    return books.map((b) => ({
      id: b.id,
      title: b.doc.title,
      subtitle: b.doc.subtitle,
      surface: b.doc.surface,
      pageCount: b.doc.pages.length,
      rev: b.rev,
      visibility: b.visibility,
      updatedAt: b.updatedAt,
    }));
  }

  async listRevisions(id: string): Promise<RevisionMeta[]> {
    const all = await (await this.db()).getAllFromIndex("revisions", "by_book", id);
    return all
      .sort((a, b) => b.rev - a.rev)
      .map((r) => ({ id: r.id, rev: r.rev, createdAt: r.createdAt }));
  }

  async restoreRevision(id: string, revisionId: string): Promise<SaveResult> {
    const db = await this.db();
    const revision = await db.get("revisions", revisionId);
    if (!revision || revision.bookId !== id) throw new NotFoundError();
    const book = await db.get("books", id);
    if (!book) throw new NotFoundError();
    // Aplica o doc da revisao como um novo save: arquiva o atual e sobe o rev.
    return this.saveBook(id, revision.doc, book.rev);
  }

  async gcAssets(id: string): Promise<void> {
    // Na 2A nao ha store de blob (uploads sao Fase 3): coletar orfaos e no-op, mas
    // o contrato exige que os assets do doc atual sobrevivam — o que e trivial aqui,
    // pois nada e removido. Confirma so que o volume existe.
    const book = await (await this.db()).get("books", id);
    if (!book) throw new NotFoundError();
  }

  assetUrl(ref: AssetRef): string {
    return ref.id;
  }
}
