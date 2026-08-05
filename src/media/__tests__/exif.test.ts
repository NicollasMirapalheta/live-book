/**
 * T2 — orientacao EXIF (MEDIA-01 AC2). Done-when: le o marcador APP1/TIFF; ausencia
 * → 1; cobre as 8 orientacoes + arquivo sem EXIF + buffer truncado (nao lanca).
 *
 * Os fixtures sao JPEGs minimos montados a mao (FFD8 + APP1 Exif + FFD9), para o
 * teste derivar do comportamento especificado, nao da implementacao.
 */

import { describe, it, expect } from "vitest";
import { readExifOrientation } from "../exif";

/**
 * Monta um JPEG minimo com um bloco Exif carregando a tag de orientacao.
 * `order`: "II" (little-endian) ou "MM" (big-endian) no cabecalho TIFF.
 */
function jpegWithOrientation(orientation: number, order: "II" | "MM" = "II"): ArrayBuffer {
  const little = order === "II";
  const u16 = (n: number): [number, number] =>
    little ? [n & 0xff, (n >> 8) & 0xff] : [(n >> 8) & 0xff, n & 0xff];
  const u32 = (n: number): number[] =>
    little
      ? [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]
      : [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];

  const orderBytes = little ? [0x49, 0x49] : [0x4d, 0x4d];
  const tiff = [
    ...orderBytes,
    ...u16(0x002a),
    ...u32(8), // IFD0 offset
    ...u16(1), // 1 entrada
    ...u16(0x0112), // tag orientacao
    ...u16(3), // tipo SHORT
    ...u32(1), // count
    ...u16(orientation), // valor (2 primeiros bytes do campo)
    0x00, 0x00, // resto do campo valor
    ...u32(0), // proxima IFD = 0
  ];
  const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff]; // "Exif\0\0" + TIFF
  const size = exif.length + 2; // o campo tamanho inclui a si mesmo (2 bytes)
  const bytes = [
    0xff, 0xd8, // SOI
    0xff, 0xe1, // APP1
    (size >> 8) & 0xff, size & 0xff, // tamanho (big-endian, formato JPEG)
    ...exif,
    0xff, 0xd9, // EOI
  ];
  return new Uint8Array(bytes).buffer;
}

describe("readExifOrientation — as 8 orientacoes (little-endian)", () => {
  for (let o = 1; o <= 8; o++) {
    it(`le orientacao ${o}`, () => {
      expect(readExifOrientation(jpegWithOrientation(o))).toBe(o);
    });
  }
});

describe("readExifOrientation — cabecalho TIFF big-endian (MM)", () => {
  it("le orientacao 6 tambem em big-endian", () => {
    expect(readExifOrientation(jpegWithOrientation(6, "MM"))).toBe(6);
  });
});

describe("readExifOrientation — ausencia e robustez", () => {
  it("JPEG sem bloco EXIF → 1", () => {
    const noExif = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer;
    expect(readExifOrientation(noExif)).toBe(1);
  });

  it("buffer que nao e JPEG → 1", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
    expect(readExifOrientation(png)).toBe(1);
  });

  it("buffer truncado no meio da IFD → 1 (nao lanca)", () => {
    const full = new Uint8Array(jpegWithOrientation(6));
    const truncated = full.slice(0, full.length - 12).buffer; // corta a entrada da IFD
    expect(() => readExifOrientation(truncated)).not.toThrow();
    expect(readExifOrientation(truncated)).toBe(1);
  });

  it("buffer vazio → 1", () => {
    expect(readExifOrientation(new ArrayBuffer(0))).toBe(1);
  });

  it("valor de orientacao fora de 1..8 cai em 1", () => {
    expect(readExifOrientation(jpegWithOrientation(99))).toBe(1);
  });
});
