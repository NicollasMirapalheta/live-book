/**
 * `lqip` — placeholder de baixa qualidade embutido no documento (MEDIA-01 AC7).
 *
 * Uma imagem 20px de maior lado, codificada em webp e devolvida como data URI de no
 * maximo 1 KB. Vai para `AssetRef.lqip` e pinta como background da caixa reservada
 * ANTES de qualquer requisicao de rede (MEDIA-05 AC2), evitando um flash vazio.
 *
 * Como `process`, a codificacao e uma dependencia injetavel; o default usa canvas,
 * os testes injetam um fake.
 */

import { fitLongest } from "./process";

/** Maior lado do LQIP, em px (spec). Minusculo de proposito: e so um borrao. */
export const LQIP_MAX_SIDE = 20;
/** Teto do data URI do LQIP, em bytes (spec MEDIA-01 AC7). */
export const LQIP_MAX_BYTES = 1024;

/** Codifica um bitmap reduzido a `targetW`x`targetH` num data URI webp. */
export interface DataUrlEncoder {
  encodeDataUrl(bitmap: ImageBitmap, targetW: number, targetH: number): Promise<string>;
}

/**
 * Produz o data URI do LQIP (20px no maior lado). O tamanho <=1 KB e garantido pela
 * escala minima; a orientacao e irrelevante num borrao de 20px que sera coberto
 * assim que a variante `page` chegar.
 */
export async function makeLqip(
  bitmap: ImageBitmap,
  encoder: DataUrlEncoder = defaultDataUrlEncoder,
): Promise<string> {
  const dims = fitLongest(bitmap.width, bitmap.height, LQIP_MAX_SIDE);
  return encoder.encodeDataUrl(bitmap, dims.w, dims.h);
}

// --- Encoder default (canvas) — nao coberto por unit (sem DOM no gate) ----------

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const defaultDataUrlEncoder: DataUrlEncoder = {
  async encodeDataUrl(bitmap, targetW, targetH) {
    const canvas = makeCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("contexto 2d indisponivel");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    if ("convertToBlob" in canvas) {
      const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.4 });
      return blobToDataUrl(blob);
    }
    return canvas.toDataURL("image/webp", 0.4);
  },
};
