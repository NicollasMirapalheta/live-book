import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import App from "../../App";
import { LiveBook } from "../../live-book";
import { renderCover, renderPages } from "../renderPages";
import { getSurface } from "../surfaces/registry";
import { asFace, leafOfFace } from "../units";
import { demoDoc } from "../../demo/demoDoc";
import "../surfaces/manuscript"; // registra manuscript
import type { RenderCtx } from "../RenderCtx";

// Integracao documento -> motor (DOC-09). O livro vindo do demoDoc deve ser
// indistinguivel da versao anterior: mesmos capitulos no sumario, nas mesmas
// folhas, e a mesma numeracao impressa pagina a pagina. windowRadius alto monta
// tudo para as consultas.

function renderDemo() {
  const surface = getSurface(demoDoc.surface);
  const ctx: RenderCtx = {
    doc: demoDoc,
    surface,
    mode: "read",
    assetUrl: (ref) => ref.id,
  };
  const reports: number[] = [];
  const utils = render(
    <LiveBook
      title={demoDoc.title}
      sound={false}
      windowRadius={999}
      onLeafChange={(l) => reports.push(l)}
      cover={renderCover(demoDoc.cover, ctx)}
      backCover={renderCover(demoDoc.backCover, ctx)}
    >
      {renderPages(demoDoc, ctx)}
    </LiveBook>,
  );
  const { container } = utils;

  const chapterButtons = () =>
    Array.from(container.querySelectorAll(".lb-toc__panel li button")).filter((b) =>
      b.querySelector(".lb-toc__page"),
    ) as HTMLButtonElement[];

  const tocLabels = () =>
    chapterButtons().map(
      (b) => b.querySelector(".lb-toc__text strong")?.textContent ?? "",
    );

  const chapterLeaf = (i: number) => {
    fireEvent.click(chapterButtons()[i]);
    return reports[reports.length - 1] ?? Number.NaN;
  };

  const printedNumbers = () =>
    Array.from(container.querySelectorAll(".lb-leaf .lb-page__num")).map((n) =>
      Number(n.textContent),
    );

  return { tocLabels, chapterLeaf, printedNumbers };
}

describe("demo como documento — integracao", () => {
  it("o sumario tem os mesmos 3 capitulos de antes, na ordem", () => {
    const { tocLabels } = renderDemo();
    expect(tocLabels()).toEqual(["01 · Começando", "02 · No dia a dia", "03 · Notas"]);
  });

  it("cada capitulo cai na folha leafOfFace(face) — nenhum spread adiante", () => {
    const { chapterLeaf } = renderDemo();
    // capitulos nos content-index 1, 4, 7 -> faces 3, 6, 9
    const expected = [1, 4, 7].map((k) => leafOfFace(asFace(k + 2)));
    expect([chapterLeaf(0), chapterLeaf(1), chapterLeaf(2)]).toEqual(expected);
  });

  it("a numeracao impressa coincide pagina a pagina: 1..10 em ordem", () => {
    const { printedNumbers } = renderDemo();
    expect(printedNumbers()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("a primeira pagina de miolo tem numero impresso 1", () => {
    const { printedNumbers } = renderDemo();
    expect(printedNumbers()[0]).toBe(1);
  });

  it("o App aplica o tema da surface como custom properties no root, sem vencer --lb-cover-square (DOC-08)", () => {
    const { container } = render(<App />);
    const root = container.querySelector(".lb-root") as HTMLElement;
    expect(root.style.getPropertyValue("--lb-accent")).toBe("#b5622a");
    expect(root.style.getPropertyValue("--lb-paper")).toBe("#faf3e2");
    // o invariante que importa: o tema NÃO vence --lb-cover-square (mantém 26px)
    expect(root.style.getPropertyValue("--lb-cover-square")).toBe("26px");
  });
});
