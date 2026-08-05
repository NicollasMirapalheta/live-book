/**
 * T1 — validacao por magic bytes (MEDIA-03). Derivado dos done-when da tarefa e da
 * edge case da spec ("arquivo nao e imagem apesar da extensao"; ">2 MB"; ">8000 px").
 * Todo caso usa BYTES, nunca a extensao — e o ponto da tarefa.
 */

import { describe, it, expect } from "vitest";
import { MAX_ASSET_BYTES, MAX_IMAGE_DIMENSION } from "../../config/limits";
import { sniffType, validateFile, checkDimensions } from "../validate";

/** Monta um ArrayBuffer a partir de bytes literais + preenchimento ate `len`. */
function bytes(head: number[], len = 16): ArrayBuffer {
  const b = new Uint8Array(len);
  b.set(head);
  return b.buffer;
}

/** Caixa ISO-BMFF `ftyp` com a marca principal dada (ex.: "avif", "heic"). */
function ftyp(brand: string): ArrayBuffer {
  const b = new Uint8Array(16);
  // bytes 0..4 = tamanho da caixa (irrelevante para o sniff); 4..8 = "ftyp"
  b.set([0x00, 0x00, 0x00, 0x18], 0);
  b.set([...Buffer.from("ftyp")], 4);
  b.set([...Buffer.from(brand)], 8);
  return b.buffer;
}

const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function webp(): ArrayBuffer {
  const b = new Uint8Array(16);
  b.set([...Buffer.from("RIFF")], 0);
  b.set([...Buffer.from("WEBP")], 8);
  return b.buffer;
}

describe("sniffType — identifica formato por assinatura, nao por extensao", () => {
  it("reconhece JPEG (FF D8 FF)", () => {
    expect(sniffType(JPEG)).toBe("jpeg");
  });
  it("reconhece PNG (assinatura de 8 bytes)", () => {
    expect(sniffType(PNG)).toBe("png");
  });
  it("reconhece WEBP (RIFF....WEBP)", () => {
    expect(sniffType(webp())).toBe("webp");
  });
  it("reconhece AVIF (ftyp marca avif)", () => {
    expect(sniffType(ftyp("avif"))).toBe("avif");
  });
  it("reconhece HEIC (ftyp marca heic)", () => {
    expect(sniffType(ftyp("heic"))).toBe("heic");
  });
  it("trata HEIF generico (mif1) como heic — recusado", () => {
    expect(sniffType(ftyp("mif1"))).toBe("heic");
  });
  it("bytes arbitrarios sao unknown", () => {
    expect(sniffType(bytes([0x00, 0x01, 0x02, 0x03]))).toBe("unknown");
  });
  it("buffer curto demais e unknown (nao lanca)", () => {
    expect(sniffType(new Uint8Array([0xff, 0xd8]).buffer)).toBe("unknown");
  });
});

describe("validateFile — recusa por bytes/tamanho", () => {
  it("HEIC → { ok:false, reason:'heic' }", async () => {
    const file = new File([ftyp("heic")], "foto.jpg", { type: "image/jpeg" });
    expect(await validateFile(file)).toEqual({ ok: false, reason: "heic" });
  });

  it("nao-imagem (apesar da extensao .jpg) → 'not-an-image'", async () => {
    const file = new File([bytes([0x00, 0x01, 0x02, 0x03])], "fake.jpg", { type: "image/jpeg" });
    expect(await validateFile(file)).toEqual({ ok: false, reason: "not-an-image" });
  });

  it("imagem valida acima de MAX_ASSET_BYTES → 'too-large'", async () => {
    const big = new Uint8Array(MAX_ASSET_BYTES + 1);
    big.set([0xff, 0xd8, 0xff, 0xe0]); // JPEG valido, mas grande demais
    const file = new File([big], "grande.jpg", { type: "image/jpeg" });
    expect(await validateFile(file)).toEqual({ ok: false, reason: "too-large" });
  });

  it("JPEG valido dentro do teto → { ok:true }", async () => {
    const file = new File([JPEG], "ok.jpg", { type: "image/jpeg" });
    expect(await validateFile(file)).toEqual({ ok: true });
  });

  it("formato precede tamanho: HEIC grande ainda recebe 'heic'", async () => {
    const big = new Uint8Array(MAX_ASSET_BYTES + 1);
    const box = new Uint8Array(ftyp("heic"));
    big.set(box.subarray(0, 16));
    const file = new File([big], "foto.heic", { type: "image/heic" });
    expect(await validateFile(file)).toEqual({ ok: false, reason: "heic" });
  });
});

describe("checkDimensions — teto de pixels apos decode", () => {
  it(`maior lado acima de ${MAX_IMAGE_DIMENSION} → 'too-many-pixels'`, () => {
    expect(checkDimensions(MAX_IMAGE_DIMENSION + 1, 1000)).toEqual({
      ok: false,
      reason: "too-many-pixels",
    });
    expect(checkDimensions(1000, MAX_IMAGE_DIMENSION + 1)).toEqual({
      ok: false,
      reason: "too-many-pixels",
    });
  });
  it("dentro do teto → { ok:true }", () => {
    expect(checkDimensions(4000, 3000)).toEqual({ ok: true });
  });
});

describe("MAX_ASSET_BYTES", () => {
  it("e 2 MB (espelhado no schema.sql)", () => {
    expect(MAX_ASSET_BYTES).toBe(2 * 1024 * 1024);
  });
});
