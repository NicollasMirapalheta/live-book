import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { NewBookRoute } from "../NewBookRoute";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { encodeRescue, getEditToken } from "../../data/editTokens";
import type { CreateResult } from "../../data/StorageAdapter";

// LIB-04, DATA-06 / AD-017 (T9): cria o volume, guarda o editToken e exibe o link de
// resgate UMA vez, depois navega para o volume criado.

function renderNew(adapter: LocalAdapter) {
  const loc = { path: "" };
  function Probe() {
    loc.path = useLocation().pathname;
    return null;
  }
  render(
    <AdapterProvider adapter={adapter}>
      <MemoryRouter initialEntries={["/new"]}>
        <Probe />
        <Routes>
          <Route path="/new" element={<NewBookRoute />} />
          <Route path="/b/:id" element={<div>LEITOR</div>} />
        </Routes>
      </MemoryRouter>
    </AdapterProvider>,
  );
  return loc;
}

describe("criação de volume (NewBookRoute)", () => {
  it("cria o volume e guarda o editToken em localStorage (DATA-06)", async () => {
    const adapter = new LocalAdapter(`new-${crypto.randomUUID()}`);
    const spy = vi.spyOn(adapter, "createBook");
    renderNew(adapter);

    fireEvent.click(screen.getByRole("button", { name: /criar/i }));
    await screen.findByRole("heading", { name: /volume criado/i });

    const { id, editToken }: CreateResult = await spy.mock.results[0].value;
    expect(spy).toHaveBeenCalledTimes(1);
    // o token de edição do volume ficou guardado para este id
    expect(getEditToken(id)).toBe(editToken);
  });

  it("exibe o link de resgate uma vez, com instrução de guardá-lo fora do navegador (AD-017)", async () => {
    const adapter = new LocalAdapter(`new-${crypto.randomUUID()}`);
    const spy = vi.spyOn(adapter, "createBook");
    renderNew(adapter);

    fireEvent.click(screen.getByRole("button", { name: /criar/i }));
    await screen.findByRole("heading", { name: /volume criado/i });
    const { id, editToken }: CreateResult = await spy.mock.results[0].value;

    // o resgate mostrado carrega o fragmento encodeRescue(id, token)
    const code = document.querySelector(".app-new__rescue")?.textContent ?? "";
    expect(code).toContain(encodeRescue(id, editToken));
    // instrução de guardar fora do navegador
    expect(screen.getByText(/fora do navegador/i)).toBeInTheDocument();
  });

  it("o volume nasce com 5 páginas em branco (não abre vazio)", async () => {
    const adapter = new LocalAdapter(`new-${crypto.randomUUID()}`);
    const spy = vi.spyOn(adapter, "createBook");
    renderNew(adapter);

    fireEvent.click(screen.getByRole("button", { name: /criar/i }));
    await screen.findByRole("heading", { name: /volume criado/i });

    const doc = spy.mock.calls[0][0];
    expect(doc.pages).toHaveLength(5);
    // páginas em branco: sem blocos
    expect(doc.pages.every((p) => p.blocks.length === 0)).toBe(true);
  });

  it("navega para o volume criado ao abrir", async () => {
    const adapter = new LocalAdapter(`new-${crypto.randomUUID()}`);
    const spy = vi.spyOn(adapter, "createBook");
    const loc = renderNew(adapter);

    fireEvent.click(screen.getByRole("button", { name: /criar/i }));
    await screen.findByRole("heading", { name: /volume criado/i });
    const { id }: CreateResult = await spy.mock.results[0].value;

    fireEvent.click(screen.getByRole("button", { name: /abrir volume/i }));
    expect(loc.path).toBe(`/b/${id}`);
  });
});
