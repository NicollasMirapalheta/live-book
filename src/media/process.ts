/**
 * `process` — decode ja feito, aqui vem a parte pura: dimensionar, orientar e
 * codificar as variantes `page` e `thumb` (MEDIA-01 AC1/AC2/AC6).
 *
 * Recebe um `ImageBitmap` (nao um `File`) de proposito: a mesma funcao roda no
 * worker (`OffscreenCanvas`) e no fallback main-thread, e o calculo de dimensoes
 * fica testavel sem DOM. A codificacao em si e uma dependencia injetavel
 * (`RasterEncoder`); o default usa canvas, os testes injetam um fake.
 *
 * `page` = 1100px no maior lado, webp <=200 KB (qualidade reduzida em passos ate
 * caber, AD-014); `thumb` = 320px. Nenhuma variante faz UPSCALE — o palco so
 * encolhe, entao ampliar so gastaria bytes.
 */

/** Maior lado da variante `page`, em px (AD-014). */
export const PAGE_MAX_SIDE = 1100;
/** Maior lado da variante `thumb`, em px. */
export const THUMB_MAX_SIDE = 320;
/** Teto de peso da variante `page`, em bytes (spec MEDIA-01 AC6). */
export const MAX_PAGE_BYTES = 200 * 1024;
/** Passos de qualidade webp tentados na `page`, do melhor ao mais leve. */
const PAGE_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42];
/** Qualidade fixa da `thumb` (pequena; nao precisa de teto de bytes). */
const THUMB_QUALITY = 0.7;

export interface ProcessedVariants {
  page: Blob;
  thumb: Blob;
  /** largura intrinseca JA corrigida por EXIF (dimensao de exibicao). */
  w: number;
  /** altura intrinseca ja corrigida por EXIF. */
  h: number;
}

/**
 * Codifica um `ImageBitmap` numa variante webp de dimensoes `targetW`x`targetH`,
 * aplicando a transformacao de `orientation` (1..8). Seam injetavel: o default
 * desenha em canvas; os testes fornecem um fake deterministico.
 */
export interface RasterEncoder {
  encode(
    bitmap: ImageBitmap,
    targetW: number,
    targetH: number,
    orientation: number,
    quality: number,
  ): Promise<Blob>;
}

/** Dimensoes de exibicao apos aplicar a orientacao EXIF: 5..8 trocam os eixos. */
export function orientedSize(w: number, h: number, orientation: number): { w: number; h: number } {
  return orientation >= 5 && orientation <= 8 ? { w: h, h: w } : { w, h };
}

/** Escala (w,h) para o maior lado caber em `maxSide`, sem NUNCA ampliar. */
export function fitLongest(w: number, h: number, maxSide: number): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { w, h };
  const scale = maxSide / longest;
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/**
 * Produz as variantes `page` e `thumb` na orientacao correta, com `page` abaixo de
 * `MAX_PAGE_BYTES` (reduzindo a qualidade em passos), e emite `w`/`h` ja corrigidos.
 */
export async function processImage(
  bitmap: ImageBitmap,
  orientation: number,
  encoder: RasterEncoder = defaultEncoder,
): Promise<ProcessedVariants> {
  const oriented = orientedSize(bitmap.width, bitmap.height, orientation);
  const pageDims = fitLongest(oriented.w, oriented.h, PAGE_MAX_SIDE);
  const thumbDims = fitLongest(oriented.w, oriented.h, THUMB_MAX_SIDE);

  // page: desce a qualidade em passos ate caber no teto; se nem o passo mais leve
  // couber, fica com o menor obtido (melhor esforco — nunca trava o lote).
  let page: Blob | null = null;
  for (const quality of PAGE_QUALITY_STEPS) {
    page = await encoder.encode(bitmap, pageDims.w, pageDims.h, orientation, quality);
    if (page.size <= MAX_PAGE_BYTES) break;
  }

  const thumb = await encoder.encode(bitmap, thumbDims.w, thumbDims.h, orientation, THUMB_QUALITY);

  return { page: page!, thumb, w: oriented.w, h: oriented.h };
}

// --- Encoder default (canvas) — nao coberto por unit (sem DOM no gate) ----------

/** Cria um canvas de desenho, preferindo `OffscreenCanvas` (worker e main-thread
 * modernos); cai em `<canvas>` onde ele nao existe. */
function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Matriz de transformacao para cada orientacao EXIF, sobre um canvas ja do
 * tamanho orientado (dw,dh). Convencao canonica de bibliotecas EXIF. */
function applyOrientation(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  orientation: number,
  dw: number,
  dh: number,
): void {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, dw, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, dw, dh); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, dh); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, dw, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, dw, dh); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, dh); break;
    default: break;
  }
}

function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/webp", quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob devolveu null"))),
      "image/webp",
      quality,
    );
  });
}

const defaultEncoder: RasterEncoder = {
  async encode(bitmap, targetW, targetH, orientation, quality) {
    const canvas = makeCanvas(targetW, targetH);
    const ctx = canvas.getContext("2d") as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null;
    if (!ctx) throw new Error("contexto 2d indisponivel");
    applyOrientation(ctx, orientation, targetW, targetH);
    // Em orientacoes que trocam os eixos (5..8), o espaco de desenho e (dh,dw).
    if (orientation >= 5 && orientation <= 8) ctx.drawImage(bitmap, 0, 0, targetH, targetW);
    else ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    return canvasToBlob(canvas, quality);
  },
};
