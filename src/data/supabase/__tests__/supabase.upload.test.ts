/**
 * T7 — upload/assetUrl/gc do `SupabaseAdapter` (AD-028), MOCKADO e offline.
 *
 * O contrato ao vivo (supabase.contract.test.ts) cobre o caminho real quando ha
 * credenciais; aqui, sem rede, um cliente fake deixa asserir a LOGICA especifica do
 * upload: o path convencionado `{bookId}/{uuid}/{size}.webp`, o `AssetRef` devolvido,
 * a URL sincrona por size, e a decisao de coleta de `gcAssets` (remove so o que a RPC
 * de ids referenciados NAO devolve — preservando doc atual e revisoes).
 */

import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAdapter } from "../SupabaseAdapter";
import { fakeProcessedImage } from "../../__tests__/adapter.contract";
import { setEditToken } from "../../editTokens";

const URL_BASE = "https://proj.supabase.co";
const BOOK_ID = "11111111-1111-1111-1111-111111111111";

interface UploadCall {
  path: string;
  blob: unknown;
  opts: { contentType?: string; upsert?: boolean };
}

/** Cliente fake com storage capturando uploads; usado nos casos de upload/assetUrl. */
function uploadClient() {
  const uploads: UploadCall[] = [];
  const client = {
    storage: {
      from: () => ({
        upload: async (path: string, blob: unknown, opts: UploadCall["opts"]) => {
          uploads.push({ path, blob, opts });
          return { data: { path }, error: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
  return { client, uploads };
}

describe("SupabaseAdapter.uploadAsset (mockado)", () => {
  it("sobe page+thumb no path {bookId}/{uuid}/{size}.webp e devolve AssetRef", async () => {
    const { client, uploads } = uploadClient();
    const adapter = new SupabaseAdapter(client, URL_BASE);
    const img = fakeProcessedImage();

    const ref = await adapter.uploadAsset(BOOK_ID, img);

    expect(ref.id.startsWith(`${BOOK_ID}/`)).toBe(true);
    expect(ref.w).toBe(img.w);
    expect(ref.h).toBe(img.h);
    expect(ref.lqip).toBe(img.lqip);

    expect(uploads.map((u) => u.path)).toEqual([`${ref.id}/page.webp`, `${ref.id}/thumb.webp`]);
    expect(uploads[0].opts.contentType).toBe("image/webp");
    expect(uploads[0].blob).toBe(img.page);
    expect(uploads[1].blob).toBe(img.thumb);
  });

  it("cada envio do mesmo arquivo gera um id novo (idempotencia por identidade)", async () => {
    const { client } = uploadClient();
    const adapter = new SupabaseAdapter(client, URL_BASE);
    const img = fakeProcessedImage();
    const a = await adapter.uploadAsset(BOOK_ID, img);
    const b = await adapter.uploadAsset(BOOK_ID, img);
    expect(a.id).not.toBe(b.id);
  });
});

describe("SupabaseAdapter.assetUrl (mockado)", () => {
  it("monta .../{id}/{size}.webp e distingue as variantes", () => {
    const adapter = new SupabaseAdapter(uploadClient().client, URL_BASE);
    const ref = { id: `${BOOK_ID}/asset-abc` };
    expect(adapter.assetUrl(ref, "page")).toBe(
      `${URL_BASE}/storage/v1/object/public/book-assets/${ref.id}/page.webp`,
    );
    expect(adapter.assetUrl(ref, "thumb")).toContain(`/${ref.id}/thumb.webp`);
    expect(adapter.assetUrl(ref, "page")).not.toBe(adapter.assetUrl(ref, "thumb"));
  });
});

describe("SupabaseAdapter.gcAssets (mockado)", () => {
  it("remove so os assets fora do conjunto referenciado pela RPC (preserva doc+revisoes)", async () => {
    const removed: string[][] = [];
    // A RPC de ids referenciados devolve doc atual + revisoes; aqui, `keep` (atual) e
    // `rev-kept` (so numa revisao). `orphan` nao aparece — deve ser coletado.
    const referenced = [`${BOOK_ID}/keep`, `${BOOK_ID}/rev-kept`];
    const listEntries = [{ name: "keep" }, { name: "rev-kept" }, { name: "orphan" }];

    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { doc: { pages: [] }, rev: 3 }, error: null }),
          }),
        }),
      }),
      rpc: async (fn: string) => {
        if (fn === "book_referenced_asset_ids") return { data: referenced, error: null };
        return { data: null, error: null };
      },
      storage: {
        from: () => ({
          list: async () => ({ data: listEntries, error: null }),
          remove: async (paths: string[]) => {
            removed.push(paths);
            return { data: null, error: null };
          },
        }),
      },
    } as unknown as SupabaseClient;

    setEditToken(BOOK_ID, "tok-valido");
    const adapter = new SupabaseAdapter(client, URL_BASE);
    await adapter.gcAssets(BOOK_ID);

    expect(removed).toHaveLength(1);
    // so o orfao (as duas variantes); keep e rev-kept preservados
    expect(removed[0]).toEqual([`${BOOK_ID}/orphan/page.webp`, `${BOOK_ID}/orphan/thumb.webp`]);
  });
});
