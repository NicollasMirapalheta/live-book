/**
 * `SupabaseAdapter` — implementação padrão do `StorageAdapter` sobre Postgres.
 *
 * Escrita passa pelas RPCs `security definer` (create/save/restore/delete), nunca
 * por escrita direta na tabela (ADR-004). O `edit_token` autoriza a escrita e é
 * guardado localmente por `editTokens` — por isso `saveBook`/`deleteBook` não
 * recebem token: eles o buscam pelo id do volume. Leitura vem da view pública
 * `books_public`, que não expõe o token.
 *
 * `assetUrl` monta a URL pública do bucket de forma SÍNCRONA (AD-013): está no
 * caminho de render das folhas, onde uma Promise quebraria o `surfaceCache`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_DOC_BYTES, MAX_PAGES } from "../../config/limits";
import type { AssetRef, AssetSize, BookDoc } from "../../book/schema";
import type { ProcessedImage } from "../../media/pipeline";
import { getEditToken, setEditToken, clearEditToken } from "../editTokens";
import {
  NotFoundError,
  RevConflictError,
  StorageUnavailableError,
  TooLargeError,
  type AdapterName,
  type BookSummary,
  type CreateResult,
  type LoadedBook,
  type RevisionMeta,
  type SaveResult,
  type StorageAdapter,
} from "../StorageAdapter";

/** Erro que uma RPC pode devolver (mensagem levantada no PL/pgSQL). */
interface RpcError {
  message: string;
}

/** Traduz o erro de uma RPC/consulta no erro tipado do contrato. Nunca retorna
 * (sempre lança) — o nome de retorno `never` documenta isso. As mensagens batem
 * com os `raise exception` de `schema.sql`. */
function raiseMapped(error: RpcError): never {
  const msg = error.message ?? "";
  if (msg.includes("rev_conflict")) throw new RevConflictError();
  if (msg.includes("too_large")) throw new TooLargeError();
  if (msg.includes("not_found")) throw new NotFoundError();
  if (msg.includes("forbidden")) throw new Error("edit_token inválido para este volume");
  // rede fora / projeto pausado / erro inesperado: a UI mostra carregando/indisponível.
  throw new StorageUnavailableError(msg);
}

/** Rejeita, sem tocar em rede, um doc acima dos limites (`TooLargeError`) — antes
 * do round-trip. Espelha `assertWithinLimits` do `LocalAdapter` e os literais do
 * `save_book`; a fonte é `src/config/limits.ts`. */
function assertWithinLimits(doc: BookDoc): void {
  if (doc.pages.length > MAX_PAGES) throw new TooLargeError();
  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (bytes > MAX_DOC_BYTES) throw new TooLargeError();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O id de um volume é um uuid. Um id malformado não pode corresponder a nenhum
 * volume — `getBook` devolve `null` em vez de deixar o Postgres estourar
 * `invalid input syntax for type uuid` (paridade com o LocalAdapter). */
function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/** Token local ou erro explícito — sem token não há como autorizar a escrita. */
function requireToken(bookId: string): string {
  const token = getEditToken(bookId);
  if (!token) throw new Error(`sem edit_token local para o volume ${bookId}`);
  return token;
}

export class SupabaseAdapter implements StorageAdapter {
  readonly name: AdapterName = "supabase";
  readonly canWrite = true;

  /** `baseUrl` sem barra final; usado por `assetUrl`. */
  private readonly baseUrl: string;

  constructor(
    private readonly client: SupabaseClient,
    baseUrl: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async createBook(doc: BookDoc): Promise<CreateResult> {
    assertWithinLimits(doc);
    const { data, error } = await this.client.rpc("create_book", { p_doc: doc });
    if (error) raiseMapped(error);
    const row = (data as Array<{ id: string; rev: number; edit_token: string }>)[0];
    setEditToken(row.id, row.edit_token);
    return { id: row.id, rev: row.rev, editToken: row.edit_token };
  }

  async getBook(id: string): Promise<LoadedBook | null> {
    if (!isUuid(id)) return null;
    const { data, error } = await this.client
      .from("books_public")
      .select("doc, rev")
      .eq("id", id)
      .maybeSingle();
    if (error) raiseMapped(error);
    if (!data) return null;
    const row = data as { doc: BookDoc; rev: number };
    return { doc: row.doc, rev: row.rev };
  }

  async saveBook(id: string, doc: BookDoc, rev: number): Promise<SaveResult> {
    assertWithinLimits(doc);
    const token = requireToken(id);
    const { data, error } = await this.client.rpc("save_book", {
      p_book_id: id,
      p_edit_token: token,
      p_doc: doc,
      p_base_rev: rev,
    });
    if (error) raiseMapped(error);
    return { rev: data as number };
  }

  async deleteBook(id: string): Promise<void> {
    const token = requireToken(id);
    const { error } = await this.client.rpc("delete_book", {
      p_book_id: id,
      p_edit_token: token,
    });
    if (error) raiseMapped(error);
    clearEditToken(id);
  }

  async listBooks(): Promise<BookSummary[]> {
    const { data, error } = await this.client
      .from("books_public")
      .select("id, title, subtitle, surface, page_count, rev, visibility, updated_at, cover");
    if (error) raiseMapped(error);
    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      subtitle: string | null;
      surface: string;
      page_count: number;
      rev: number;
      visibility: "private" | "link";
      updated_at: string;
      cover: AssetRef | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle ?? undefined,
      surface: r.surface,
      pageCount: r.page_count,
      rev: r.rev,
      visibility: r.visibility,
      updatedAt: r.updated_at,
      cover: r.cover ?? undefined,
    }));
  }

  async listRevisions(id: string): Promise<RevisionMeta[]> {
    const token = requireToken(id);
    const { data, error } = await this.client.rpc("list_revisions", {
      p_book_id: id,
      p_edit_token: token,
    });
    if (error) raiseMapped(error);
    const rows = (data ?? []) as Array<{ id: string; rev: number; created_at: string }>;
    return rows.map((r) => ({ id: r.id, rev: r.rev, createdAt: r.created_at }));
  }

  async restoreRevision(id: string, revisionId: string): Promise<SaveResult> {
    const token = requireToken(id);
    const { data, error } = await this.client.rpc("restore_revision", {
      p_book_id: id,
      p_edit_token: token,
      p_revision_id: revisionId,
    });
    if (error) raiseMapped(error);
    return { rev: data as number };
  }

  async uploadAsset(bookId: string, img: ProcessedImage): Promise<AssetRef> {
    // O id do asset carrega o prefixo do volume: `{bookId}/{uuid}`. Assim o path do
    // bucket fica escopado por volume (policy/gc por prefixo) e `assetUrl(ref, size)`
    // — que so tem `ref` — consegue montar a URL sozinha (AD-028, invariante 5).
    const refId = `${bookId}/${crypto.randomUUID()}`;
    const bucket = this.client.storage.from("book-assets");

    const page = await bucket.upload(`${refId}/page.webp`, img.page, {
      contentType: "image/webp",
      upsert: false,
    });
    if (page.error) raiseMapped(page.error);

    const thumb = await bucket.upload(`${refId}/thumb.webp`, img.thumb, {
      contentType: "image/webp",
      upsert: false,
    });
    if (thumb.error) raiseMapped(thumb.error);

    return { id: refId, w: img.w, h: img.h, lqip: img.lqip };
  }

  async gcAssets(id: string): Promise<void> {
    const book = await this.getBook(id);
    if (!book) throw new NotFoundError();
    const token = requireToken(id);

    // Conjunto referenciado = doc atual + toda revisão retida, computado no servidor
    // (RPC espelha `collectAssetIds`): preservar o que uma versão restaurável cita
    // (AD-025) exige ler os docs das revisões, que só o SQL alcança.
    const { data: refData, error: refError } = await this.client.rpc(
      "book_referenced_asset_ids",
      { p_book_id: id, p_edit_token: token },
    );
    if (refError) raiseMapped(refError);
    const referenced = new Set((refData ?? []) as string[]);

    const bucket = this.client.storage.from("book-assets");
    const { data: entries, error: listError } = await bucket.list(id);
    if (listError) raiseMapped(listError);

    const orphanPaths: string[] = [];
    for (const entry of entries ?? []) {
      const refId = `${id}/${entry.name}`;
      if (!referenced.has(refId)) {
        orphanPaths.push(`${refId}/page.webp`, `${refId}/thumb.webp`);
      }
    }
    if (orphanPaths.length > 0) {
      const { error: removeError } = await bucket.remove(orphanPaths);
      if (removeError) raiseMapped(removeError);
    }
  }

  assetUrl(ref: AssetRef, size: AssetSize = "page"): string {
    return `${this.baseUrl}/storage/v1/object/public/book-assets/${ref.id}/${size}.webp`;
  }
}
