import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from "react-router-dom";
import { useEffect } from "react";
import { ReaderRoute } from "../ReaderRoute";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../../book/schema";

// LIB-02 (T5): sincronização URL ↔ motor. Virar substitui a entrada de histórico
// (replace); back/forward do navegador leva o livro à posição correspondente; sem
// laço URL→goTo→onLeafChange→URL.

function numberedPages(n: number): BookPage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    blocks: [{ id: `b${i}`, type: "text", html: `<p>pagina ${i + 1}</p>` }],
  }));
}
const doc10: BookDoc = {
  schemaVersion: SCHEMA_VERSION,
  id: "x",
  title: "Vol",
  surface: "manuscript",
  pages: numberedPages(10),
};

const label = () => document.querySelector(".lb-progress__label")?.textContent ?? "";

interface Ctl {
  nav: NavigateFunction;
  path: string;
  /** um registro por mudança real de pathname (não por render). */
  paths: string[];
}

async function mount(entries: (id: string) => string[], index: number) {
  const adapter = new LocalAdapter(`sync-${crypto.randomUUID()}`);
  const { id } = await adapter.createBook(doc10);
  const ctl: Ctl = { nav: (() => {}) as unknown as NavigateFunction, path: "", paths: [] };

  function Probe() {
    const nav = useNavigate();
    const loc = useLocation();
    ctl.nav = nav;
    ctl.path = loc.pathname;
    useEffect(() => {
      ctl.paths.push(loc.pathname);
    }, [loc.pathname]);
    return null;
  }

  render(
    <AdapterProvider adapter={adapter}>
      <MemoryRouter initialEntries={entries(id)} initialIndex={index}>
        <Probe />
        <Routes>
          <Route path="/" element={<div>ESTANTE</div>} />
          <Route path="/b/:id" element={<ReaderRoute />} />
          <Route path="/b/:id/p/:page" element={<ReaderRoute />} />
        </Routes>
      </MemoryRouter>
    </AdapterProvider>,
  );
  return { id, ctl };
}

describe("sincronização URL ↔ motor", () => {
  it("virar a página SUBSTITUI a entrada de histórico (LIB-02 AC2)", async () => {
    const { id, ctl } = await mount((id) => ["/", `/b/${id}/p/1`], 1);
    await waitFor(() => expect(label()).toContain("1/10"));

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    // folha 1 → 2, cujo recto é a página 3 → URL canônica /p/3.
    await waitFor(() => expect(ctl.path).toBe(`/b/${id}/p/3`));

    // replace (não push): voltar do navegador cai na estante, não em /p/1.
    await act(async () => {
      ctl.nav(-1);
    });
    await waitFor(() => expect(ctl.path).toBe("/"));
  });

  it("back/forward do navegador leva o livro à posição correspondente (LIB-02 AC3)", async () => {
    const { id, ctl } = await mount((id) => [`/b/${id}/p/3`], 0);
    await waitFor(() => expect(label()).toContain("3/10"));

    // avança para /p/9 (como um forward/URL digitada) → o motor acompanha.
    await act(async () => {
      ctl.nav(`/b/${id}/p/9`);
    });
    await waitFor(() => expect(label()).toContain("9/10"));

    // volta (back) → o motor retorna à posição de /p/3.
    await act(async () => {
      ctl.nav(-1);
    });
    await waitFor(() => expect(label()).toContain("3/10"));
  });

  it("não realimenta: uma virada gera exatamente uma navegação canônica (sem laço)", async () => {
    const { id, ctl } = await mount((id) => ["/", `/b/${id}/p/1`], 1);
    await waitFor(() => expect(label()).toContain("1/10"));
    ctl.paths.length = 0; // ignora as navegações da carga inicial

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    await waitFor(() => expect(ctl.path).toBe(`/b/${id}/p/3`));
    // espaço para uma eventual cascata se manifestar
    await new Promise((r) => setTimeout(r, 50));

    // Se houvesse laço URL→goTo→onLeafChange→URL, /p/3 seria re-navegada em cascata.
    const toP3 = ctl.paths.filter((p) => p === `/b/${id}/p/3`);
    expect(toP3).toHaveLength(1);
  });
});
