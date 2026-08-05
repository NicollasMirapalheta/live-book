/**
 * `validate` — porta de entrada de arquivo do pipeline de midia (MEDIA-03).
 *
 * Aceita `jpeg/png/webp/avif`, recusa HEIC e nao-imagem por MAGIC BYTES (nunca por
 * extensao — a extensao mente), e barra objetos acima de `MAX_ASSET_BYTES`. Sem
 * dependencia externa; recebe bytes/`File`, nada de DOM.
 *
 * O teto de pixels (`MAX_IMAGE_DIMENSION`) so e verificavel apos o decode, quando as
 * dimensoes reais existem: `checkDimensions` e puro e o pipeline (T4) o aplica sobre
 * `bitmap.width/height` — assim uma imagem gigante e RECUSADA em vez de travar.
 */

import { MAX_ASSET_BYTES, MAX_IMAGE_DIMENSION } from "../config/limits";

/** Formatos que o pipeline reconhece por assinatura. `unknown` = nao-imagem. */
export type SniffedType = "jpeg" | "png" | "webp" | "avif" | "heic" | "unknown";

/** Por que um arquivo foi recusado. Cada valor mapeia a uma mensagem de UI. */
export type RejectReason = "heic" | "not-an-image" | "too-large" | "too-many-pixels";

export type ValidationResult = { ok: true } | { ok: false; reason: RejectReason };

/** Marcas ISO-BMFF (caixa `ftyp`) que identificam um arquivo como HEIC/HEIF. AVIF
 * usa a mesma caixa mas com marca principal `avif`/`avis`; por isso a marca
 * principal decide, e as genericas de HEIF (`mif1`/`msf1`) caem em heic (recusadas). */
const HEIC_BRANDS = new Set([
  "heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1",
]);
const AVIF_BRANDS = new Set(["avif", "avis"]);

function ascii(bytes: Uint8Array, start: number, len: number): string {
  let s = "";
  for (let i = start; i < start + len; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/**
 * Identifica o formato pelos primeiros bytes do arquivo, NAO pela extensao.
 * Requer ao menos os primeiros ~12 bytes; buffers menores caem em `unknown`.
 */
export function sniffType(buf: ArrayBuffer): SniffedType {
  const b = new Uint8Array(buf);
  if (b.length < 12) return "unknown";

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "png";

  // WEBP: "RIFF" ....  "WEBP"
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";

  // ISO-BMFF: caixa "ftyp" nos bytes 4..8; a marca principal (8..12) decide.
  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (AVIF_BRANDS.has(brand)) return "avif";
    if (HEIC_BRANDS.has(brand)) return "heic";
  }

  return "unknown";
}

/** Le os bytes de um `Blob`. Prefere `arrayBuffer()` (browsers/undici); cai em
 * `FileReader` onde ele nao existe (jsdom, no gate de teste). */
function readArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Valida um `File` pelo que e conhecivel sem decodificar: tipo (magic bytes) e
 * tamanho. A precedencia coloca o formato antes do tamanho, para um HEIC grande
 * ainda receber a mensagem util "exporte como JPEG" em vez de so "grande demais".
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  const header = (await readArrayBuffer(file)).slice(0, 32);
  const type = sniffType(header);

  if (type === "heic") return { ok: false, reason: "heic" };
  if (type === "unknown") return { ok: false, reason: "not-an-image" };
  if (file.size > MAX_ASSET_BYTES) return { ok: false, reason: "too-large" };
  return { ok: true };
}

/**
 * Guarda de pixels, aplicado apos o decode (o pipeline conhece `bitmap.width/height`).
 * Puro: mantem `validateFile` livre de decode e testavel isoladamente.
 */
export function checkDimensions(width: number, height: number): ValidationResult {
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return { ok: false, reason: "too-many-pixels" };
  }
  return { ok: true };
}
