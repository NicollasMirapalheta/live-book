/**
 * T3 — variantes `page`/`thumb` (MEDIA-01 AC1/AC2/AC6). Derivado dos done-when:
 * page=1100px e <=200 KB (qualidade reduzida em passos), thumb=320px, orientacao
 * EXIF aplicada e w/h corrigidos emitidos. Sem upscale.
 *
 * A codificacao real e canvas (sem DOM no gate), entao injetamos um `RasterEncoder`
 * fake deterministico: ele registra as dimensoes/qualidade pedidas e devolve um Blob
 * de tamanho controlavel — assim testamos o comportamento especificado, nao o canvas.
 */

import { describe, it, expect } from "vitest";
import {
  processImage,
  orientedSize,
  fitLongest,
  MAX_PAGE_BYTES,
  PAGE_MAX_SIDE,
  THUMB_MAX_SIDE,
  type RasterEncoder,
} from "../process";

function bitmap(width: number, height: number): ImageBitmap {
  return { width, height } as unknown as ImageBitmap;
}

interface Call {
  w: number;
  h: number;
  orientation: number;
  quality: number;
}

/** Fake encoder: registra cada chamada e devolve um Blob cujo tamanho e `sizeFor(q)`. */
function fakeEncoder(sizeFor: (quality: number) => number = () => 1000) {
  const calls: Call[] = [];
  const encoder: RasterEncoder = {
    async encode(_bitmap, w, h, orientation, quality) {
      calls.push({ w, h, orientation, quality });
      return new Blob([new Uint8Array(sizeFor(quality))]);
    },
  };
  return { calls, encoder };
}

describe("orientedSize / fitLongest (puros)", () => {
  it("orientedSize troca eixos em 5..8, mantem nos demais", () => {
    expect(orientedSize(400, 300, 1)).toEqual({ w: 400, h: 300 });
    expect(orientedSize(400, 300, 6)).toEqual({ w: 300, h: 400 });
    expect(orientedSize(400, 300, 8)).toEqual({ w: 300, h: 400 });
  });
  it("fitLongest escala o maior lado e nao amplia", () => {
    expect(fitLongest(2200, 1650, 1100)).toEqual({ w: 1100, h: 825 });
    expect(fitLongest(800, 600, 1100)).toEqual({ w: 800, h: 600 }); // sem upscale
  });
});

describe("processImage — dimensoes das variantes", () => {
  it("page = 1100px e thumb = 320px no maior lado", async () => {
    const { calls, encoder } = fakeEncoder();
    await processImage(bitmap(2200, 1650), 1, encoder);
    const pageCall = calls[0];
    const thumbCall = calls[calls.length - 1];
    expect(Math.max(pageCall.w, pageCall.h)).toBe(PAGE_MAX_SIDE);
    expect(pageCall).toMatchObject({ w: 1100, h: 825 });
    expect(Math.max(thumbCall.w, thumbCall.h)).toBe(THUMB_MAX_SIDE);
    expect(thumbCall).toMatchObject({ w: 320, h: 240 });
  });

  it("nao faz upscale de imagem menor que o alvo", async () => {
    const { calls, encoder } = fakeEncoder();
    await processImage(bitmap(800, 600), 1, encoder);
    expect(calls[0]).toMatchObject({ w: 800, h: 600 }); // page mantem o original
  });
});

describe("processImage — orientacao EXIF (MEDIA-01 AC2)", () => {
  it("emite w/h corrigidos e repassa a orientacao ao encoder", async () => {
    const { calls, encoder } = fakeEncoder();
    // fonte paisagem 4000x3000 com orientacao 6 (girar 90) -> exibicao retrato
    const result = await processImage(bitmap(4000, 3000), 6, encoder);
    expect(result.w).toBe(3000);
    expect(result.h).toBe(4000);
    // a page sai em retrato (825x1100), derivada das dimensoes JA orientadas
    expect(calls[0]).toMatchObject({ w: 825, h: 1100, orientation: 6 });
  });
});

describe("processImage — teto de 200 KB por reducao de qualidade (MEDIA-01 AC6)", () => {
  it("reduz a qualidade em passos ate a page caber no teto", async () => {
    // acima de 0.6 estoura o teto; 0.52 e abaixo cabem
    const { calls, encoder } = fakeEncoder((q) => (q > 0.6 ? 300 * 1024 : 100 * 1024));
    const result = await processImage(bitmap(2200, 1650), 1, encoder);

    expect(result.page.size).toBeLessThanOrEqual(MAX_PAGE_BYTES);
    const pageCalls = calls.slice(0, -1); // tudo menos a thumb final
    expect(pageCalls.length).toBeGreaterThan(1); // houve reducao em passos
    const qualities = pageCalls.map((c) => c.quality);
    const decreasing = qualities.every((q, i) => i === 0 || q < qualities[i - 1]);
    expect(decreasing).toBe(true);
  });

  it("se nem o passo mais leve couber, devolve o menor obtido sem lancar ou travar", async () => {
    const { calls, encoder } = fakeEncoder(() => 500 * 1024); // nunca cabe
    const result = await processImage(bitmap(2200, 1650), 1, encoder);
    expect(result.page).toBeInstanceOf(Blob);
    const pageCalls = calls.slice(0, -1);
    expect(pageCalls.length).toBe(5); // esgotou todos os passos, mas nao travou
  });
});
