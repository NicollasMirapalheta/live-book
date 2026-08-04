import { fireEvent, render, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { LiveBook, Page } from "../index";

/**
 * Helper de montagem para os testes de caracterizacao do motor (Fase 0).
 *
 * Toda observacao do motor passa por aqui e SO pela API publica: as props do
 * `LiveBook`, o teclado, o callback `onLeafChange` e o DOM renderizado. Nenhum
 * teste consulta o DOM direto — se um seletor mudar, conserta-se num lugar so.
 *
 * Os seletores CSS abaixo foram LIDOS de LiveBook.tsx/Leaf.tsx/live-book.css no
 * momento da escrita (nao inventados):
 *   .lb-leaf                          uma folha montada
 *   .lb-face--front / .lb-face--back  as duas faces da folha (frente = 2i, verso = 2i+1)
 *   .lb-page--{endpaper|blank|cover}  variantes de casca/enchimento
 *   .lb-page__num                     numero impresso do miolo
 *   .lb-toc__panel                    sumario (sempre no DOM; escondido por CSS)
 *   .lb-toc__page                     numero impresso de um item de capitulo do sumario
 */

export interface RenderBookOpts {
  windowRadius?: number;
  initialLeaf?: number;
  /** content-page index (0-based) -> rotulo de capitulo */
  chapters?: Record<number, string>;
  /** content-page index (0-based) -> titulo */
  titles?: Record<number, string>;
  /** content-page indices que devem esconder o numero */
  hideNumbers?: number[];
}

type FaceKind = "cover" | "back-cover" | "endpaper" | "blank" | "page";

function classifyFace(el: Element): FaceKind {
  const cls = el.className;
  if (cls.includes("lb-page--endpaper")) return "endpaper";
  if (cls.includes("lb-page--blank")) return "blank";
  if (cls.includes("lb-page--cover")) return "cover"; // capa OU contracapa; posicao decide
  return "page";
}

export function renderBook(n: number, opts: RenderBookOpts = {}) {
  const { windowRadius, initialLeaf = 0, chapters = {}, titles = {}, hideNumbers = [] } = opts;

  const pages: ReactElement[] = [];
  for (let i = 0; i < n; i += 1) {
    pages.push(
      <Page
        key={i}
        chapter={chapters[i]}
        title={titles[i]}
        hideNumber={hideNumbers.includes(i)}
      >
        conteudo {i + 1}
      </Page>,
    );
  }

  const reports: number[] = [];
  const utils = render(
    <LiveBook
      title="Caracterizacao"
      sound={false}
      initialLeaf={initialLeaf}
      windowRadius={windowRadius}
      cover={<div>capa</div>}
      backCover={<div>contracapa</div>}
      onLeafChange={(leaf) => reports.push(leaf)}
    >
      {pages}
    </LiveBook>,
  );

  const { container } = utils;

  /** As faces montadas, em ordem de indice (frente antes de verso por folha). */
  const faces = (): Element[] => {
    const out: Element[] = [];
    container.querySelectorAll(".lb-leaf").forEach((leaf) => {
      const front = leaf.querySelector(".lb-face--front .lb-page");
      const back = leaf.querySelector(".lb-face--back .lb-page");
      if (front) out.push(front);
      if (back) out.push(back);
    });
    return out;
  };

  /** Sequencia de tipos de face, com a ultima "cover" reclassificada como
   * contracapa por posicao (a classe nao distingue capa de contracapa). */
  const faceKinds = (): FaceKind[] => {
    const kinds = faces().map(classifyFace);
    for (let i = kinds.length - 1; i >= 0; i -= 1) {
      if (kinds[i] === "cover") {
        kinds[i] = "back-cover";
        break;
      }
    }
    return kinds;
  };

  const mountedLeaves = (): number => container.querySelectorAll(".lb-leaf").length;

  /** Total de folhas do volume, lido pela API publica: "End" navega para o fim e
   * o motor reporta o leaf de destino (= leaves) via onLeafChange. */
  const leaves = (): number => {
    fireEvent.keyDown(document, { key: "End" });
    return reports[reports.length - 1];
  };

  const printedNumbers = (): number[] =>
    faces()
      .map((f) => f.querySelector(".lb-page__num")?.textContent)
      .filter((t): t is string => t != null)
      .map((t) => Number(t));

  /** Botoes de capitulo do sumario (os que tem numero impresso — Capa/Contracapa
   * nao tem). */
  const chapterButtons = (): HTMLButtonElement[] => {
    const panel = container.querySelector(".lb-toc__panel");
    if (!panel) return [];
    return Array.from(panel.querySelectorAll("li button")).filter((b) =>
      b.querySelector(".lb-toc__page"),
    ) as HTMLButtonElement[];
  };

  const tocLabels = (): string[] =>
    chapterButtons().map((b) => within(b).getByText((_, el) => el?.tagName === "STRONG").textContent ?? "");

  const tocPrintedNumbers = (): number[] =>
    chapterButtons().map((b) => Number(b.querySelector(".lb-toc__page")?.textContent));

  /** Folha reportada pelo motor ao clicar no n-esimo item de capitulo do sumario.
   * E como se le, pela API publica, a folha que o motor associou aquele capitulo. */
  const chapterLeaf = (chapterIndex: number): number => {
    const before = reports.length;
    fireEvent.click(chapterButtons()[chapterIndex]);
    return reports.length > before ? reports[reports.length - 1] : Number.NaN;
  };

  return {
    ...utils,
    reports,
    faces,
    faceKinds,
    mountedLeaves,
    leaves,
    printedNumbers,
    tocLabels,
    tocPrintedNumbers,
    chapterLeaf,
  };
}
