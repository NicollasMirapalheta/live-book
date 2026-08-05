/**
 * T9 — uploadBatch (dimensoes implicitas: falha parcial, concorrencia, integridade
 * de transicao). Done-when:
 *  - falha no meio do lote preserva os ja enviados e devolve os falhados; retomar
 *    reenvia so os que faltam
 *  - nenhuma pagina parcial e produzida por ingestao cancelada
 *  - arquivo recusado (HEIC/nao-imagem) e pulado sem quebrar o lote
 *
 * Spec (dimensoes): "upload em pipeline (processa N+1 enquanto sobe N), serial por
 * arquivo". O `process` e injetado (fake) para exercitar sem worker/DOM.
 */

import { describe, it, expect, vi } from "vitest";
import { uploadBatch, type UploadBatchDeps } from "../uploadBatch";
import { ImageRejectedError, type ProcessedImage } from "../../media/pipeline";
import type { AssetRef } from "../../book/schema";
import type { StorageAdapter } from "../../data/StorageAdapter";

function file(name: string): File {
  return new File([new Uint8Array(4)], name, { type: "image/jpeg" });
}

/** `lqip` carrega a identidade do arquivo (Blob.text() e instavel no jsdom), para
 * o adapter fake rastrear qual arquivo virou qual asset. */
function processed(tag: string): ProcessedImage {
  return {
    page: new Blob([tag]),
    thumb: new Blob([tag]),
    lqip: tag,
    w: 1100,
    h: 800,
  };
}

/** adapter minimo: `uploadAsset` devolve um ref com id derivado do blob (para
 * rastrear qual arquivo virou qual asset). Demais metodos sao spies que NAO devem
 * ser tocados por uploadBatch. */
function makeAdapter(
  upload: (bookId: string, img: ProcessedImage) => Promise<AssetRef>,
): StorageAdapter {
  return {
    name: "local",
    canWrite: true,
    createBook: vi.fn(),
    getBook: vi.fn(),
    saveBook: vi.fn(),
    deleteBook: vi.fn(),
    listBooks: vi.fn(),
    listRevisions: vi.fn(),
    restoreRevision: vi.fn(),
    uploadAsset: vi.fn(upload),
    gcAssets: vi.fn(),
    assetUrl: vi.fn(),
  } as unknown as StorageAdapter;
}

const okDeps = (over: Partial<UploadBatchDeps> = {}): UploadBatchDeps => ({
  process: async (f) => processed(f.name),
  ...over,
});

describe("uploadBatch — arquivo recusado pulado sem quebrar o lote", () => {
  it("HEIC/nao-imagem recusado na validacao vai para failed com o motivo; os demais sobem", async () => {
    const deps = okDeps({
      process: async (f) => {
        if (f.name === "b.heic") throw new ImageRejectedError("heic");
        if (f.name === "c.txt") throw new ImageRejectedError("not-an-image");
        return processed(f.name);
      },
    });
    let n = 0;
    const adapter = makeAdapter(async () => ({ id: `asset-${n++}` }));

    const result = await uploadBatch(
      [file("a.jpg"), file("b.heic"), file("c.txt"), file("d.jpg")],
      "book1",
      adapter,
      undefined,
      deps,
    );

    // os dois validos subiram; os dois recusados nao quebraram o lote
    expect(result.uploaded).toHaveLength(2);
    expect(result.failed).toEqual([
      { file: "b.heic", reason: "heic" },
      { file: "c.txt", reason: "not-an-image" },
    ]);
    expect(adapter.uploadAsset).toHaveBeenCalledTimes(2);
  });
});

describe("uploadBatch — falha de upload no meio do lote", () => {
  it("preserva os ja enviados, devolve o falhado, e NAO gera AssetRef para ele (sem pagina parcial)", async () => {
    const adapter = makeAdapter(async (_book, img) => {
      const tag = img.lqip;
      if (tag === "b.jpg") throw new Error("network down");
      return { id: tag };
    });

    const result = await uploadBatch(
      [file("a.jpg"), file("b.jpg"), file("c.jpg")],
      "book1",
      adapter,
      undefined,
      okDeps(),
    );

    // a e c permanecem; b falhou
    expect(result.uploaded.map((r) => r.id)).toEqual(["a.jpg", "c.jpg"]);
    expect(result.failed).toEqual([{ file: "b.jpg", reason: "upload-failed" }]);
    // integridade de transicao: nenhum AssetRef para o arquivo que falhou
    expect(result.uploaded.some((r) => r.id === "b.jpg")).toBe(false);
  });

  it("nunca escreve o documento (saveBook/createBook nao sao chamados) — pagina e responsabilidade da rota", async () => {
    const adapter = makeAdapter(async (_b, img) => ({ id: img.lqip }));
    await uploadBatch([file("a.jpg"), file("b.jpg")], "book1", adapter, undefined, okDeps());
    expect(adapter.saveBook).not.toHaveBeenCalled();
    expect(adapter.createBook).not.toHaveBeenCalled();
  });
});

describe("uploadBatch — retomavel", () => {
  it("retomar com so os arquivos que faltaram reenvia apenas esses", async () => {
    const adapter = makeAdapter(async (_b, img) => ({ id: img.lqip }));

    // 1a passada: b falha
    const first = makeAdapter(async (_b, img) => {
      const tag = img.lqip;
      if (tag === "b.jpg") throw new Error("network down");
      return { id: tag };
    });
    const r1 = await uploadBatch(
      [file("a.jpg"), file("b.jpg"), file("c.jpg")],
      "book1",
      first,
      undefined,
      okDeps(),
    );
    expect(r1.failed.map((f) => f.file)).toEqual(["b.jpg"]);

    // retomada: so os que faltaram (b)
    const remaining = r1.failed.map((f) => file(f.file));
    const r2 = await uploadBatch(remaining, "book1", adapter, undefined, okDeps());

    expect(r2.uploaded.map((r) => r.id)).toEqual(["b.jpg"]);
    // so o arquivo que faltava foi reenviado, nao a e c
    expect(adapter.uploadAsset).toHaveBeenCalledTimes(1);
  });
});

describe("uploadBatch — concorrencia (pipeline + serial)", () => {
  it("processa N+1 enquanto sobe N (o proximo processa antes de o upload atual terminar)", async () => {
    const events: string[] = [];
    let releaseUploadA: () => void = () => {};
    const uploadAGate = new Promise<void>((res) => {
      releaseUploadA = res;
    });

    const deps = okDeps({
      process: async (f) => {
        events.push(`process:${f.name}`);
        return processed(f.name);
      },
    });
    const adapter = makeAdapter(async (_b, img) => {
      const tag = img.lqip;
      events.push(`upload-start:${tag}`);
      if (tag === "a.jpg") await uploadAGate; // segura o upload de a
      events.push(`upload-end:${tag}`);
      return { id: tag };
    });

    const p = uploadBatch([file("a.jpg"), file("b.jpg")], "book1", adapter, undefined, deps);

    // deixa o microtask do pipeline rodar enquanto o upload de a esta preso
    await Promise.resolve();
    await Promise.resolve();

    // b ja foi processado enquanto o upload de a ainda nao terminou
    expect(events).toContain("process:b.jpg");
    expect(events).toContain("upload-start:a.jpg");
    expect(events).not.toContain("upload-end:a.jpg");

    releaseUploadA();
    await p;

    // upload serial: o upload de b so comeca depois de a terminar
    expect(events.indexOf("upload-start:b.jpg")).toBeGreaterThan(events.indexOf("upload-end:a.jpg"));
  });
});

describe("uploadBatch — progresso", () => {
  it("onProgress e chamado uma vez por arquivo com o acumulado de done/uploaded/failed", async () => {
    const adapter = makeAdapter(async (_b, img) => {
      const tag = img.lqip;
      if (tag === "b.jpg") throw new Error("down");
      return { id: tag };
    });
    const progress = vi.fn();
    await uploadBatch(
      [file("a.jpg"), file("b.jpg"), file("c.jpg")],
      "book1",
      adapter,
      progress,
      okDeps(),
    );

    expect(progress).toHaveBeenCalledTimes(3);
    expect(progress).toHaveBeenLastCalledWith({ done: 3, total: 3, uploaded: 2, failed: 1 });
  });
});
