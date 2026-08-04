import { describe, it, expect } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from "react-router-dom";
import { AppRouter } from "../AppRouter";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../../book/schema";

// LIB-01 AC4/AC5, LIB-03 (T6): /c/:slug resolve e redireciona (replace) para a URL
// canônica de página; slug inexistente cai na 1ª página; :n fora do intervalo é
// limitado, sem erro.

function pagesWithChapter(): BookPage[] {
  const pages: BookPage[] = Array.from({ length: 10 }, (_, i) => ({
    id: `p${i}`,
    blocks: [{ id: `b${i}`, type: "text", html: `<p>pagina ${i + 1}</p>` }],
  }));
  // capítulo na página impressa 5 (índice 4).
  pages[4] = { ...pages[4], chapter: "02 · No dia a dia" };
  return pages;
}
const doc: BookDoc = {
  schemaVersion: SCHEMA_VERSION,
  id: "x",
  title: "Vol",
  surface: "manuscript",
  pages: pagesWithChapter(),
};

const label = () => document.querySelector(".lb-progress__label")?.textContent ?? "";

interface Ctl {
  nav: NavigateFunction;
  path: string;
}

async function mount(entries: (id: string) => string[], index: number) {
  const adapter = new LocalAdapter(`chap-${crypto.randomUUID()}`);
  const { id } = await adapter.createBook(doc);
  const ctl: Ctl = { nav: (() => {}) as unknown as NavigateFunction, path: "" };

  function Probe() {
    ctl.nav = useNavigate();
    ctl.path = useLocation().pathname;
    return null;
  }

  render(
    <AdapterProvider adapter={adapter}>
      <MemoryRouter initialEntries={entries(id)} initialIndex={index}>
        <Probe />
        <AppRouter />
      </MemoryRouter>
    </AdapterProvider>,
  );
  return { id, ctl };
}

describe("rota de capítulo e limites", () => {
  it("/c/:slug resolve e redireciona para a URL canônica de página (LIB-01 AC4)", async () => {
    const { id, ctl } = await mount((id) => [`/b/${id}/c/02-no-dia-a-dia`], 0);
    await waitFor(() => expect(ctl.path).toBe(`/b/${id}/p/5`));
    await waitFor(() => expect(label()).toContain("5/10"));
  });

  it("o redirect de capítulo é replace, não push", async () => {
    const { id, ctl } = await mount((id) => ["/", `/b/${id}/c/02-no-dia-a-dia`], 1);
    await waitFor(() => expect(ctl.path).toBe(`/b/${id}/p/5`));
    // replace: voltar não retorna ao /c/:slug, cai na estante.
    await act(async () => {
      ctl.nav(-1);
    });
    await waitFor(() => expect(ctl.path).toBe("/"));
  });

  it("slug inexistente cai na 1ª página, sem erro (edge case)", async () => {
    const { id, ctl } = await mount((id) => [`/b/${id}/c/nao-existe`], 0);
    await waitFor(() => expect(ctl.path).toBe(`/b/${id}/p/1`));
    await waitFor(() => expect(label()).toContain("1/10"));
  });

  it(":n acima do intervalo é limitado à última página, sem erro (LIB-01 AC5)", async () => {
    await mount((id) => [`/b/${id}/p/999`], 0);
    await waitFor(() => expect(label()).toContain("10/10"));
  });

  it(":n abaixo de 1 (ex.: capa/0) cai na 1ª página, sem erro (LIB-01 AC5)", async () => {
    await mount((id) => [`/b/${id}/p/0`], 0);
    await waitFor(() => expect(label()).toContain("1/10"));
  });
});
