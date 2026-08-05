import { expect, test } from "@playwright/test";
import zlib from "node:zlib";

/**
 * Verificacao automatizada de performance (MEDIA-11 AC1/AC2, Success Criteria).
 *
 * Sob throttle 4x de CPU, folheia 20 paginas com foto e:
 *  - conta as faces montadas com windowRadius=2 e FALHA acima de 10 (AD-014);
 *  - mede o FPS ao folhear e FALHA abaixo de 30.
 * As asserções são reais: um motor que perdesse a virtualizacao (todas as 20 fotos
 * montadas) ou engasgasse sob carga faria o teste falhar.
 *
 * Semeadura por fixture (injecao direta no IndexedDB do LocalAdapter), NAO pela
 * rota de importacao: (a) mantem o e2e focado no que o MEDIA-11 mede — o motor
 * renderizando paginas de foto, nao o pipeline de upload (coberto por unit/contrato);
 * (b) evita um defeito do pipeline em navegador real (`process`/`worker` detacham o
 * ImageBitmap: "drawImage ... image source is detached"), que os testes de unidade
 * em jsdom nao pegam. O defeito e de outra fase (T3/T4) e esta reportado a parte.
 *
 * Navegacao: `vite.config` usa `base: "./"`, entao um carregamento DURO de uma rota
 * com 2+ segmentos (ex.: `/b/:id`) resolve os assets como `/b/assets/...` -> 404. Por
 * isso o teste carrega SO a raiz `/` (assets resolvem) e alcanca o leitor por
 * navegacao SPA (pushState + popstate), como o produto faz.
 */

// --- gerador de PNG valido, sem dependencia externa (RGB 8-bit) — para o lqip ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePngDataUri(width: number, height: number, rgb: [number, number, number]): string {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y += 1) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      raw[o++] = rgb[0];
      raw[o++] = rgb[1];
      raw[o++] = rgb[2];
    }
  }
  const png = Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const PHOTO_COUNT = 20;
const FACE_BUDGET = 10; // AD-014: windowRadius=2 => no maximo 10 faces montadas
const MIN_FPS = 30; // Success Criteria: >=30 FPS sob throttle 4x

test("20 paginas com foto: >=30 FPS sob throttle 4x e <=10 faces montadas", async ({ page }) => {
  // Carrega a raiz (assets resolvem) — o app sobe no LocalAdapter offline.
  await page.goto("/");
  await page.waitForFunction(() => "indexedDB" in window);

  // Semeia um album de 20 paginas de foto direto no IndexedDB do LocalAdapter.
  const lqip = makePngDataUri(20, 15, [120, 90, 160]);
  const bookId = await page.evaluate(
    async ({ count, schemaVersion, lqip }) => {
      const uuid = () => crypto.randomUUID();
      const pages = Array.from({ length: count }, () => ({
        id: uuid(),
        blocks: [{ id: uuid(), type: "image", asset: { id: uuid(), w: 1100, h: 825, lqip } }],
      }));
      const id = uuid();
      const now = new Date().toISOString();
      const doc = { schemaVersion, id, title: "Perf album", surface: "album", pages };
      const record = {
        id,
        doc,
        rev: 1,
        editToken: uuid(),
        visibility: "link",
        createdAt: now,
        updatedAt: now,
      };
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("live-book");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("books", "readwrite");
          tx.objectStore("books").put(record);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
      return id;
    },
    { count: PHOTO_COUNT, schemaVersion: 1, lqip },
  );

  // Alcanca o leitor por navegacao SPA (o app ja esta carregado — sem refetch de asset).
  await page.evaluate((url) => {
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, `/b/${bookId}`);

  await expect(page.locator(".lb-root")).toBeVisible();
  await page.locator(".lb-viewport").waitFor();
  // guarda: o album realmente tem 20 paginas.
  await expect(page.locator(".lb-footer__pages-total")).toHaveText(`de ${PHOTO_COUNT}`);

  // --- MEDIA-04 AC1 / T19: faces montadas <= 10 com windowRadius = 2 ---
  // No meio do volume a janela esta cheia (pior caso). Cada foto e uma face com
  // `.bk-image`; a virtualizacao deve manter no maximo 10 montadas.
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(400);
  const mountedImageFaces = await page.locator(".lb-leaf .bk-image").count();
  expect(mountedImageFaces).toBeGreaterThan(0); // ha fotos montadas
  expect(mountedImageFaces).toBeLessThanOrEqual(FACE_BUDGET);

  // --- MEDIA-11 AC1 / Success Criteria: FPS >= 30 sob throttle 4x ---
  await page.keyboard.press("Home");
  await page.waitForTimeout(500);

  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  // Amostra os frames (rAF) enquanto o teste folheia; sob throttle, uma virada
  // engasgada espaca os frames e derruba o FPS medido.
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __raf: number };
    w.__frames = [];
    const loop = (t: number) => {
      w.__frames.push(t);
      w.__raf = requestAnimationFrame(loop);
    };
    w.__raf = requestAnimationFrame(loop);
  });

  for (let i = 0; i < PHOTO_COUNT; i += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
  }

  const frames = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __raf: number };
    cancelAnimationFrame(w.__raf);
    return w.__frames;
  });

  await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  expect(frames.length).toBeGreaterThan(2);
  const elapsedSeconds = (frames[frames.length - 1] - frames[0]) / 1000;
  const fps = (frames.length - 1) / elapsedSeconds;
  expect(fps).toBeGreaterThanOrEqual(MIN_FPS);
});
