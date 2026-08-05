/**
 * T3 — LQIP (MEDIA-01 AC7). Done-when: data URI de 20px no maior lado, <=1 KB.
 * A codificacao (canvas) e injetada por um fake que registra as dimensoes pedidas.
 */

import { describe, it, expect } from "vitest";
import { makeLqip, LQIP_MAX_SIDE, LQIP_MAX_BYTES, type DataUrlEncoder } from "../lqip";

function bitmap(width: number, height: number): ImageBitmap {
  return { width, height } as unknown as ImageBitmap;
}

function fakeEncoder() {
  const calls: Array<{ w: number; h: number }> = [];
  const encoder: DataUrlEncoder = {
    async encodeDataUrl(_bitmap, targetW, targetH) {
      calls.push({ w: targetW, h: targetH });
      // Um data URI webp realista de miniatura de 20px (dezenas de bytes).
      return "data:image/webp;base64," + "A".repeat(200);
    },
  };
  return { calls, encoder };
}

describe("makeLqip", () => {
  it("reduz ao maior lado de 20px antes de codificar", async () => {
    const { calls, encoder } = fakeEncoder();
    await makeLqip(bitmap(4000, 3000), encoder);
    expect(Math.max(calls[0].w, calls[0].h)).toBe(LQIP_MAX_SIDE);
    expect(calls[0]).toEqual({ w: 20, h: 15 });
  });

  it("nao amplia uma imagem ja menor que 20px", async () => {
    const { calls, encoder } = fakeEncoder();
    await makeLqip(bitmap(10, 8), encoder);
    expect(calls[0]).toEqual({ w: 10, h: 8 });
  });

  it("devolve um data URI webp de no maximo 1 KB", async () => {
    const { encoder } = fakeEncoder();
    const uri = await makeLqip(bitmap(4000, 3000), encoder);
    expect(uri.startsWith("data:image/webp")).toBe(true);
    expect(uri.length).toBeLessThanOrEqual(LQIP_MAX_BYTES);
  });
});
