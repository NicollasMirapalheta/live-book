/**
 * Worker de processamento de imagem (MEDIA-02 AC3). Recebe um `ImageBitmap` + a
 * orientacao EXIF e roda `processImage` fora da main thread, devolvendo as variantes.
 * E a MESMA `processImage` do fallback — o ambiente muda, a logica nao.
 *
 * O tsconfig usa a lib DOM (nao WebWorker), entao `self` e tipado localmente com a
 * forma que o worker realmente expoe (postMessage com lista de transferencia).
 */

import { processImage } from "./process";

interface WorkerRequest {
  bitmap: ImageBitmap;
  orientation: number;
}

type WorkerResponse =
  | { ok: true; page: Blob; thumb: Blob; w: number; h: number }
  | { ok: false; error: string };

declare const self: {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
};

self.onmessage = async (event) => {
  const { bitmap, orientation } = event.data;
  try {
    const { page, thumb, w, h } = await processImage(bitmap, orientation);
    self.postMessage({ ok: true, page, thumb, w, h });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err) });
  }
};
