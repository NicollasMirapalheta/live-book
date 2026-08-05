/**
 * `pipeline` — orquestra validacao + decode + `process` + `lqip` num `ProcessedImage`
 * (MEDIA-01/02). Roda o processamento pesado num Web Worker (`OffscreenCanvas`) para
 * nao bloquear a main thread mais de 50 ms/arquivo; onde worker/OffscreenCanvas nao
 * existem, cai para a main thread, um arquivo por vez.
 *
 * As dependencias de ambiente (validar, detectar worker, decodificar, processar,
 * lqip) sao um seam injetavel: o default fala com o DOM/worker; os testes injetam
 * fakes e verificam a escolha worker-vs-fallback e a composicao do resultado sem DOM.
 */

import { readExifOrientation } from "./exif";
import { makeLqip } from "./lqip";
import { processImage, type ProcessedVariants } from "./process";
import {
  checkDimensions,
  validateFile,
  type RejectReason,
  type ValidationResult,
} from "./validate";

/** Resultado do pipeline — NUNCA serializado no doc (blobs + data URI). */
export interface ProcessedImage {
  page: Blob;
  thumb: Blob;
  lqip: string;
  w: number;
  h: number;
}

/** Erro tipado de arquivo recusado; o lote (T9) o captura para registrar `{file, reason}`. */
export class ImageRejectedError extends Error {
  constructor(readonly reason: RejectReason) {
    super(`image_rejected:${reason}`);
    this.name = "ImageRejectedError";
  }
}

/** Seam de ambiente do pipeline. O default liga no DOM; testes injetam fakes. */
export interface PipelineDeps {
  validate(file: File): Promise<ValidationResult>;
  checkDimensions(w: number, h: number): ValidationResult;
  /** worker + OffscreenCanvas disponiveis? Decide worker vs fallback. */
  supportsWorker(): boolean;
  decode(file: File): Promise<{ bitmap: ImageBitmap; orientation: number }>;
  /** processamento off-thread (worker OffscreenCanvas). */
  runWorker(bitmap: ImageBitmap, orientation: number): Promise<ProcessedVariants>;
  /** processamento na main thread (fallback serial). */
  runMain(bitmap: ImageBitmap, orientation: number): Promise<ProcessedVariants>;
  makeLqip(bitmap: ImageBitmap): Promise<string>;
}

/**
 * Processa UM arquivo num `ProcessedImage`. Recusa (por validacao ou por excesso de
 * pixels apos o decode) lanca `ImageRejectedError` sem travar. Escolhe worker quando
 * disponivel; senao processa na main thread.
 */
export async function processInPipeline(
  file: File,
  deps: PipelineDeps = defaultDeps,
): Promise<ProcessedImage> {
  const valid = await deps.validate(file);
  if (!valid.ok) throw new ImageRejectedError(valid.reason);

  const { bitmap, orientation } = await deps.decode(file);

  const dims = deps.checkDimensions(bitmap.width, bitmap.height);
  if (!dims.ok) throw new ImageRejectedError(dims.reason);

  // O lqip e computado ANTES de despachar ao worker: o caminho worker TRANSFERE o
  // bitmap (transfer list do postMessage), o que o DESANEXA na main thread; fazer o
  // lqip depois disso lanca "the image source is detached". O borrao de 20px na main
  // thread e desprezivel (<50ms, MEDIA-01 AC3). No fallback main-thread a ordem e
  // indiferente (nao ha transferencia).
  const lqip = await deps.makeLqip(bitmap);

  const variants = deps.supportsWorker()
    ? await deps.runWorker(bitmap, orientation)
    : await deps.runMain(bitmap, orientation);

  return { page: variants.page, thumb: variants.thumb, lqip, w: variants.w, h: variants.h };
}

// --- Deps default (DOM/worker) — nao coberto por unit (sem DOM no gate) ----------

function runInWorker(bitmap: ImageBitmap, orientation: number): Promise<ProcessedVariants> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { ok: true; page: Blob; thumb: Blob; w: number; h: number }
        | { ok: false; error: string };
      worker.terminate();
      if (data.ok) resolve({ page: data.page, thumb: data.thumb, w: data.w, h: data.h });
      else reject(new Error(data.error));
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };
    worker.postMessage({ bitmap, orientation }, [bitmap as unknown as Transferable]);
  });
}

const defaultDeps: PipelineDeps = {
  validate: validateFile,
  checkDimensions,
  supportsWorker: () => typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined",
  async decode(file) {
    const buf = await file.arrayBuffer();
    const orientation = readExifOrientation(buf);
    const bitmap = await createImageBitmap(new Blob([buf]));
    return { bitmap, orientation };
  },
  runWorker: runInWorker,
  runMain: (bitmap, orientation) => processImage(bitmap, orientation),
  makeLqip,
};
