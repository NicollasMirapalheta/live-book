/**
 * Suite de contrato do `StorageAdapter` (DATA-01, L3 da estrategia de testes).
 *
 * UMA suite, rodada contra CADA implementacao gravavel via `runAdapterContract`.
 * Este arquivo NAO e coletado pelo vitest (nao termina em `.test.ts`); ele e
 * IMPORTADO e invocado a partir de `local.contract.test.ts` (T6) e
 * `public.contract.test.ts` (T7 roda o subconjunto de leitura). Se o `LocalAdapter`
 * nao passa aqui, a abstracao vazou detalhe de backend — e descobre-se em segundos.
 *
 * Derivado dos AC da spec: DATA-01 (contrato/assetUrl), DATA-02 (round-trip fiel
 * incluindo bloco desconhecido), DATA-07 (historico: arquiva, poda em REVISION_CAP,
 * restaura gerando nova revisao), DATA-08 (conflito de rev sem alterar estado;
 * save incrementa rev em 1) e a edge case de limites (`TooLargeError`).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MAX_PAGES, MAX_DOC_BYTES, REVISION_CAP } from "../../config/limits";
import { createEmptyDoc, createPage, createBlock } from "../../book/factory";
import { demoDoc } from "../../demo/demoDoc";
import type { AssetRef, AssetSize, Block, BookDoc } from "../../book/schema";
import type { ProcessedImage } from "../../media/pipeline";
import {
  RevConflictError,
  TooLargeError,
  type StorageAdapter,
} from "../StorageAdapter";

/** Doc pequeno e valido para os casos de create/save/rev. */
function smallDoc(title = "Volume"): BookDoc {
  return createEmptyDoc({
    title,
    surface: "manuscript",
    pages: [createPage({ blocks: [createBlock("text", { html: `<p>${title}</p>` })] })],
  });
}

/** Doc rico: o demo real MAIS um bloco de `type` desconhecido, para provar o
 * round-trip fiel incluindo o desconhecido (invariante 7, DATA-02). */
function richDocWithUnknownBlock(): BookDoc {
  const base = structuredClone(demoDoc);
  base.pages.push({
    id: "p-unknown",
    blocks: [
      {
        id: "u1",
        type: "diagrama-3d",
        nodes: [1, 2, 3],
        meta: { aninhado: true },
      } as unknown as Block,
    ],
  });
  return base;
}

/** `ProcessedImage` fake para os casos de upload — blobs pequenos e distinguiveis
 * por tamanho, `w`/`h`/`lqip` conhecidos, para asserir o que o `AssetRef` carrega. */
export function fakeProcessedImage(): ProcessedImage {
  return {
    page: new Blob([new Uint8Array(1200)], { type: "image/webp" }),
    thumb: new Blob([new Uint8Array(300)], { type: "image/webp" }),
    lqip: "data:image/webp;base64,LQIP",
    w: 1100,
    h: 825,
  };
}

/** Doc de uma pagina cuja unica imagem referencia `asset`. */
function docWithImage(asset: AssetRef): BookDoc {
  return createEmptyDoc({
    title: "com imagem",
    pages: [createPage({ blocks: [createBlock("image", { asset })] })],
  });
}

function docWithTooManyPages(): BookDoc {
  return createEmptyDoc({
    title: "Gigante",
    pages: Array.from({ length: MAX_PAGES + 1 }, () => createPage()),
  });
}

function docTooManyBytes(): BookDoc {
  return createEmptyDoc({
    title: "Pesado",
    pages: [
      createPage({ blocks: [createBlock("text", { html: "x".repeat(MAX_DOC_BYTES + 100) })] }),
    ],
  });
}

export function runAdapterContract(name: string, make: () => Promise<StorageAdapter>): void {
  describe(`StorageAdapter (contrato): ${name}`, () => {
    let adapter: StorageAdapter;

    beforeEach(async () => {
      adapter = await make();
    });

    it("createBook devolve id, rev inicial 1 e editToken", async () => {
      const { id, rev, editToken } = await adapter.createBook(smallDoc());
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
      expect(rev).toBe(1);
      expect(typeof editToken).toBe("string");
      expect(editToken.length).toBeGreaterThan(0);
    });

    it("getBook devolve o documento salvo sem perda, incluindo bloco desconhecido (DATA-02)", async () => {
      const doc = richDocWithUnknownBlock();
      const { id } = await adapter.createBook(doc);
      const loaded = await adapter.getBook(id);
      expect(loaded).not.toBeNull();
      expect(loaded!.doc).toEqual(doc);
      // o bloco desconhecido especificamente sobreviveu intacto:
      const lastPage = loaded!.doc.pages[loaded!.doc.pages.length - 1];
      const unknown = lastPage.blocks[0] as Record<string, unknown>;
      expect(unknown).toEqual({ id: "u1", type: "diagrama-3d", nodes: [1, 2, 3], meta: { aninhado: true } });
    });

    it("getBook de id inexistente devolve null", async () => {
      expect(await adapter.getBook("nao-existe")).toBeNull();
    });

    it("saveBook bem-sucedido incrementa rev em exatamente 1 e persiste o novo doc (DATA-08 AC3)", async () => {
      const { id, rev } = await adapter.createBook(smallDoc("v1"));
      const novo = smallDoc("v2");
      const saved = await adapter.saveBook(id, novo, rev);
      expect(saved.rev).toBe(rev + 1);
      const loaded = await adapter.getBook(id);
      expect(loaded!.rev).toBe(rev + 1);
      expect(loaded!.doc).toEqual(novo);
    });

    it("saveBook com rev divergente lanca RevConflictError e NAO altera o estado (DATA-08 AC1)", async () => {
      const original = smallDoc("original");
      const { id, rev } = await adapter.createBook(original);
      const tentativa = smallDoc("tentativa");
      await expect(adapter.saveBook(id, tentativa, rev + 99)).rejects.toBeInstanceOf(
        RevConflictError,
      );
      const loaded = await adapter.getBook(id);
      expect(loaded!.rev).toBe(rev); // rev intacto
      expect(loaded!.doc).toEqual(original); // doc intacto
    });

    it("deleteBook remove e getBook passa a devolver null", async () => {
      const { id } = await adapter.createBook(smallDoc());
      await adapter.deleteBook(id);
      expect(await adapter.getBook(id)).toBeNull();
    });

    it("assetUrl e sincrona e devolve string (invariante 5, DATA-01 AC2)", () => {
      const url = adapter.assetUrl({ id: "asset-123" });
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });

    it("save arquiva a versao anterior antes de sobrescrever (DATA-07 AC3)", async () => {
      const { id, rev } = await adapter.createBook(smallDoc("v1"));
      expect(await adapter.listRevisions(id)).toHaveLength(0);
      await adapter.saveBook(id, smallDoc("v2"), rev);
      const revisions = await adapter.listRevisions(id);
      expect(revisions).toHaveLength(1);
      expect(revisions[0].rev).toBe(rev); // arquivou o rev que existia antes
    });

    it("poda o historico em REVISION_CAP na mesma operacao de save (DATA-07 AC4)", async () => {
      let { id, rev } = await adapter.createBook(smallDoc("v0"));
      // REVISION_CAP + 5 saves -> mais de REVISION_CAP versoes arquivadas
      for (let i = 0; i < REVISION_CAP + 5; i++) {
        const saved = await adapter.saveBook(id, smallDoc(`v${i + 1}`), rev);
        rev = saved.rev;
      }
      const revisions = await adapter.listRevisions(id);
      expect(revisions.length).toBe(REVISION_CAP);
    });

    it("restoreRevision devolve o conteudo exato da revisao e gera nova revisao (DATA-07 AC5)", async () => {
      const v1 = smallDoc("conteudo-original");
      const { id, rev } = await adapter.createBook(v1);
      const afterSave = await adapter.saveBook(id, smallDoc("conteudo-novo"), rev);

      const revisions = await adapter.listRevisions(id);
      const alvo = revisions.find((r) => r.rev === rev)!; // a revisao que arquivou v1
      const restored = await adapter.restoreRevision(id, alvo.id);

      // a restauracao ela mesma gera uma nova revisao (rev sobe de novo)
      expect(restored.rev).toBe(afterSave.rev + 1);
      const loaded = await adapter.getBook(id);
      expect(loaded!.doc).toEqual(v1); // conteudo exato da revisao escolhida
    });

    it("gcAssets preserva os assets referenciados pelo doc atual", async () => {
      const doc = createEmptyDoc({
        title: "com imagem",
        pages: [createPage({ blocks: [createBlock("image", { asset: { id: "keep-me" } })] })],
      });
      const { id } = await adapter.createBook(doc);
      await adapter.gcAssets(id);
      const loaded = await adapter.getBook(id);
      const image = loaded!.doc.pages[0].blocks[0] as { asset: { id: string } };
      expect(image.asset.id).toBe("keep-me");
      expect(adapter.assetUrl({ id: "keep-me" })).toContain("keep-me");
    });

    it("createBook recusa doc acima de MAX_PAGES com TooLargeError (edge case)", async () => {
      await expect(adapter.createBook(docWithTooManyPages())).rejects.toBeInstanceOf(
        TooLargeError,
      );
    });

    it("createBook recusa doc acima de MAX_DOC_BYTES com TooLargeError (edge case)", async () => {
      await expect(adapter.createBook(docTooManyBytes())).rejects.toBeInstanceOf(TooLargeError);
    });

    it("saveBook recusa doc grande demais sem alterar o estado (edge case)", async () => {
      const original = smallDoc("intacto");
      const { id, rev } = await adapter.createBook(original);
      await expect(adapter.saveBook(id, docWithTooManyPages(), rev)).rejects.toBeInstanceOf(
        TooLargeError,
      );
      const loaded = await adapter.getBook(id);
      expect(loaded!.rev).toBe(rev);
      expect(loaded!.doc).toEqual(original);
    });
  });
}

/**
 * Bloco de contrato de UPLOAD (AD-028), rodado contra cada adapter GRAVAVEL. Alem do
 * `adapter`, o `setup` fornece `assetStored` — uma sonda que inspeciona o backing
 * store — para que a COLETA de orfaos por `gcAssets` seja observavel de forma
 * agnostica ao backend (IndexedDB no local, bucket no supabase). Derivado dos AC de
 * MEDIA-03/AD-028: round-trip por size, id novo por envio, gc preserva revisao.
 */
export function runUploadContract(
  name: string,
  setup: () => Promise<{
    adapter: StorageAdapter;
    assetStored: (assetId: string, size: AssetSize) => Promise<boolean>;
  }>,
): void {
  describe(`StorageAdapter (contrato de upload): ${name}`, () => {
    it("uploadAsset devolve AssetRef com id novo e w/h/lqip do ProcessedImage", async () => {
      const { adapter } = await setup();
      const { id: bookId } = await adapter.createBook(smallDoc());
      const img = fakeProcessedImage();
      const ref = await adapter.uploadAsset(bookId, img);
      expect(typeof ref.id).toBe("string");
      expect(ref.id.length).toBeGreaterThan(0);
      expect(ref.w).toBe(img.w);
      expect(ref.h).toBe(img.h);
      expect(ref.lqip).toBe(img.lqip);
    });

    it("assetUrl honra o size: page e thumb resolvem a URLs distintas (sincronas)", async () => {
      const { adapter } = await setup();
      const { id: bookId } = await adapter.createBook(smallDoc());
      const ref = await adapter.uploadAsset(bookId, fakeProcessedImage());
      const page = adapter.assetUrl(ref, "page");
      const thumb = adapter.assetUrl(ref, "thumb");
      expect(typeof page).toBe("string");
      expect(page.length).toBeGreaterThan(0);
      expect(typeof thumb).toBe("string");
      expect(page).not.toBe(thumb);
    });

    it("reenviar o mesmo arquivo gera um id novo (idempotencia por identidade)", async () => {
      const { adapter } = await setup();
      const { id: bookId } = await adapter.createBook(smallDoc());
      const img = fakeProcessedImage();
      const a = await adapter.uploadAsset(bookId, img);
      const b = await adapter.uploadAsset(bookId, img);
      expect(a.id).not.toBe(b.id);
    });

    it("gcAssets coleta orfaos mas preserva o referenciado pelo doc atual E por revisao retida (AD-025/AD-028)", async () => {
      const { adapter, assetStored } = await setup();
      const { id, rev } = await adapter.createBook(smallDoc("sem imagens"));

      const inRevision = await adapter.uploadAsset(id, fakeProcessedImage());
      const inCurrent = await adapter.uploadAsset(id, fakeProcessedImage());
      const orphan = await adapter.uploadAsset(id, fakeProcessedImage());

      // v2 referencia `inRevision`; v3 referencia `inCurrent` (arquiva v2).
      const r2 = await adapter.saveBook(id, docWithImage(inRevision), rev);
      await adapter.saveBook(id, docWithImage(inCurrent), r2.rev);

      await adapter.gcAssets(id);

      // referenciado pelo doc atual: sobrevive
      expect(await assetStored(inCurrent.id, "page")).toBe(true);
      // referenciado so por uma revisao RETIDA: sobrevive (nao so o doc atual)
      expect(await assetStored(inRevision.id, "page")).toBe(true);
      // referenciado por ninguem: coletado
      expect(await assetStored(orphan.id, "page")).toBe(false);
    });
  });
}

/** Subconjunto de LEITURA do contrato, para adapters `canWrite=false`
 * (`PublicAdapter`, T7). A escrita e verificada separadamente (deve rejeitar). */
export function runReadContract(
  name: string,
  make: () => Promise<{ adapter: StorageAdapter; seededId: string; seededDoc: BookDoc }>,
): void {
  describe(`StorageAdapter (contrato de leitura): ${name}`, () => {
    it("getBook devolve o documento semeado sem perda", async () => {
      const { adapter, seededId, seededDoc } = await make();
      const loaded = await adapter.getBook(seededId);
      expect(loaded).not.toBeNull();
      expect(loaded!.doc).toEqual(seededDoc);
    });

    it("getBook de id inexistente devolve null", async () => {
      const { adapter } = await make();
      expect(await adapter.getBook("nao-existe")).toBeNull();
    });

    it("assetUrl e sincrona e devolve string (invariante 5)", async () => {
      const { adapter } = await make();
      const url = adapter.assetUrl({ id: "asset-123" });
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    });
  });
}
