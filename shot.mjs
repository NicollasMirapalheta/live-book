import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  const url = (req.url ?? "/").split("?")[0];
  const file = join("dist", url === "/" ? "index.html" : url);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("nope");
  }
});
await new Promise((r) => server.listen(4173, r));

// Sem executablePath fixo: o proprio Playwright resolve o navegador que instalou
// (`npx playwright install chromium`), entao o script funciona em qualquer SO.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto("http://localhost:4173/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/01-capa.png" });

// meio da virada
await page.evaluate(() => document.querySelector(".lb-nav--next").click());
await page.screenshot({ path: "shots/02-virando.png", animations: "allow" });
await page.waitForTimeout(900);
await page.screenshot({ path: "shots/03-spread.png" });

// canto enrolando
await page.hover(".lb-corner--next");
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/04-canto.png" });

// sumario
await page.hover(".lb-toc__ribbon");
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/05-sumario.png" });

// salto de capitulo (cascata)
const items = await page.$$(".lb-toc__panel li button");
await items[3].click({ force: true });
await page.waitForTimeout(1400);
await page.screenshot({ path: "shots/06-capitulo3.png" });

// arraste da folha pela faixa da borda
await page.mouse.move(720, 860);
await page.waitForTimeout(400);
await page.click(".lb-nav--prev");
await page.waitForTimeout(1200);
const box = await page.$eval(".lb-grip--next", (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x - 230, box.y - 20, { steps: 14 });
await page.waitForTimeout(120);
await page.screenshot({ path: "shots/07-arraste.png" });
await page.mouse.up();
await page.waitForTimeout(900);

console.log("erros:", errors.length ? errors : "nenhum");
await browser.close();
server.close();
