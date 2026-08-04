/**
 * `StorageAdapter` — o contrato unico de persistencia (DATA-01).
 *
 * O resto do produto conhece SOMENTE esta interface (Open Host Service). Tres
 * implementacoes a satisfazem — `SupabaseAdapter`, `LocalAdapter`, `PublicAdapter` —
 * e uma unica suite de contrato (`adapter.contract.ts`) roda contra todas. Nenhum
 * detalhe de Postgres, IndexedDB ou rede vaza para fora deste tipo.
 *
 * `assetUrl` e SINCRONA de proposito (invariante 5): esta no caminho de render das
 * folhas, onde uma Promise quebraria o `surfaceCache` (`AD-013`).
 */

import type { AssetRef, AssetSize, BookDoc, SurfaceId } from "../book/schema";

export type AdapterName = "supabase" | "local" | "public";

/** O que a estante carrega — nunca `BookDoc` inteiro (invariante 6). */
export interface BookSummary {
  id: string;
  title: string;
  subtitle?: string;
  surface: SurfaceId;
  pageCount: number;
  rev: number;
  visibility: "private" | "link";
  /** ISO 8601. */
  updatedAt: string;
  /** miniatura da estante. */
  cover?: AssetRef;
}

/** Devolvido uma unica vez na criacao; carrega o `editToken` (AD-017). */
export interface CreateResult {
  id: string;
  rev: number;
  editToken: string;
}

export interface SaveResult {
  rev: number;
}

export interface LoadedBook {
  /** documento CRU, exatamente como armazenado (sem migrar nem sanitizar — AD-026). */
  doc: BookDoc;
  rev: number;
}

export interface RevisionMeta {
  id: string;
  /** o `rev` que esta revisao arquivou. */
  rev: number;
  createdAt: string;
}

export interface StorageAdapter {
  readonly name: AdapterName;
  readonly canWrite: boolean;

  createBook(doc: BookDoc): Promise<CreateResult>;
  /** leitura; devolve o doc CRU (sem sanitizar) ou `null` se inexistente/apagado. */
  getBook(id: string): Promise<LoadedBook | null>;
  /** escrita; conflito por `rev` diverge -> `RevConflictError`, sem alterar nada. */
  saveBook(id: string, doc: BookDoc, rev: number): Promise<SaveResult>;
  deleteBook(id: string): Promise<void>;
  /** leitura para a estante (2B); so colunas de sumario. */
  listBooks(): Promise<BookSummary[]>;
  listRevisions(id: string): Promise<RevisionMeta[]>;
  /** escrita; restaura o doc da revisao e ISSO gera uma nova revisao. */
  restoreRevision(id: string, revisionId: string): Promise<SaveResult>;
  /** escrita; coleta assets orfaos, preservando os referenciados pelo doc atual. */
  gcAssets(id: string): Promise<void>;
  /** SINCRONA (invariante 5) — devolve string. */
  assetUrl(ref: AssetRef, size?: AssetSize): string;
}

/** Save com `rev` divergente do servidor. Nunca vira sobrescrita silenciosa. */
export class RevConflictError extends Error {
  constructor(message = "rev_conflict") {
    super(message);
    this.name = "RevConflictError";
  }
}

/** Volume apagado ou inexistente. */
export class NotFoundError extends Error {
  constructor(message = "not_found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Documento acima de `MAX_DOC_BYTES` ou `MAX_PAGES`. */
export class TooLargeError extends Error {
  constructor(message = "too_large") {
    super(message);
    this.name = "TooLargeError";
  }
}

/** Escrita tentada num adapter somente-leitura (`PublicAdapter`). */
export class WriteForbiddenError extends Error {
  constructor(message = "write_forbidden") {
    super(message);
    this.name = "WriteForbiddenError";
  }
}

/** Backend indisponivel (projeto pausado / rede fora) — a UI mostra carregando. */
export class StorageUnavailableError extends Error {
  constructor(message = "storage_unavailable") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}
