/**
 * T4 — pipeline worker + fallback (MEDIA-02 AC3/AC4, MEDIA-01). Done-when: worker e
 * fallback produzem o MESMO ProcessedImage (mesma process); sem OffscreenCanvas cai
 * no fallback main-thread; arquivo recusado nao trava.
 *
 * Worker/OffscreenCanvas nao existem no gate, entao o seam de ambiente e injetado:
 * os fakes deixam observar a escolha worker-vs-fallback e a composicao do resultado.
 */

import { describe, it, expect, vi } from "vitest";
import {
  processInPipeline,
  ImageRejectedError,
  type PipelineDeps,
  type ProcessedImage,
} from "../pipeline";
import type { ProcessedVariants } from "../process";

function bitmap(width = 2200, height = 1650): ImageBitmap {
  return { width, height } as unknown as ImageBitmap;
}

const variants: ProcessedVariants = {
  page: new Blob([new Uint8Array(1000)]),
  thumb: new Blob([new Uint8Array(100)]),
  w: 2200,
  h: 1650,
};

/** deps que passam validacao e delegam worker/main a `process` compartilhada. */
function makeDeps(over: Partial<PipelineDeps> = {}): PipelineDeps {
  const process = vi.fn(async () => variants);
  return {
    validate: async () => ({ ok: true }),
    checkDimensions: () => ({ ok: true }),
    supportsWorker: () => true,
    decode: async () => ({ bitmap: bitmap(), orientation: 1 }),
    runWorker: process,
    runMain: process,
    makeLqip: async () => "data:image/webp;base64,LQ",
    ...over,
  };
}

describe("processInPipeline — recusa sem travar", () => {
  it("arquivo invalido lanca ImageRejectedError e nao decodifica", async () => {
    const decode = vi.fn();
    const deps = makeDeps({
      validate: async () => ({ ok: false, reason: "heic" }),
      decode,
    });
    await expect(processInPipeline(new File([], "x.heic"), deps)).rejects.toMatchObject({
      name: "ImageRejectedError",
      reason: "heic",
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it("excesso de pixels apos o decode recusa sem processar", async () => {
    const runMain = vi.fn(async () => variants);
    const deps = makeDeps({
      supportsWorker: () => false,
      checkDimensions: () => ({ ok: false, reason: "too-many-pixels" }),
      runMain,
    });
    await expect(processInPipeline(new File([], "big.jpg"), deps)).rejects.toBeInstanceOf(
      ImageRejectedError,
    );
    expect(runMain).not.toHaveBeenCalled();
  });
});

describe("processInPipeline — escolha worker vs fallback", () => {
  it("com suporte usa o worker, nao a main thread", async () => {
    const runWorker = vi.fn(async () => variants);
    const runMain = vi.fn(async () => variants);
    const deps = makeDeps({ supportsWorker: () => true, runWorker, runMain });
    await processInPipeline(new File([], "a.jpg"), deps);
    expect(runWorker).toHaveBeenCalledTimes(1);
    expect(runMain).not.toHaveBeenCalled();
  });

  it("sem OffscreenCanvas cai no fallback main-thread", async () => {
    const runWorker = vi.fn(async () => variants);
    const runMain = vi.fn(async () => variants);
    const deps = makeDeps({ supportsWorker: () => false, runWorker, runMain });
    await processInPipeline(new File([], "a.jpg"), deps);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(runWorker).not.toHaveBeenCalled();
  });
});

describe("processInPipeline — composicao do ProcessedImage", () => {
  const expected: ProcessedImage = {
    page: variants.page,
    thumb: variants.thumb,
    lqip: "data:image/webp;base64,LQ",
    w: 2200,
    h: 1650,
  };

  it("worker e fallback produzem o MESMO ProcessedImage (mesma process)", async () => {
    const viaWorker = await processInPipeline(
      new File([], "a.jpg"),
      makeDeps({ supportsWorker: () => true }),
    );
    const viaMain = await processInPipeline(
      new File([], "a.jpg"),
      makeDeps({ supportsWorker: () => false }),
    );
    expect(viaWorker).toEqual(expected);
    expect(viaMain).toEqual(expected);
    expect(viaWorker).toEqual(viaMain);
  });
});
