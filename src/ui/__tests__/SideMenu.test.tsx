import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
// AC5: o componente vive em src/ui/ (irmão do motor). Este import parte de
// src/ui/__tests__ para ../SideMenu — a própria localização é a evidência.
import { SideMenu } from "../SideMenu";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc } from "../../book/schema";

// LIB-06 (T10): troca rápida de volume. Lista os volumes como lombadas (atual
// marcado); acionar troca por rota sem reload; um volume só informa.

function doc(title: string): BookDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "x",
    title,
    surface: "manuscript",
    pages: [{ id: "p0", blocks: [] }],
  };
}

async function seedBooks(titles: string[]) {
  const adapter = new LocalAdapter(`side-${crypto.randomUUID()}`);
  const ids: Record<string, string> = {};
  for (const t of titles) {
    const { id } = await adapter.createBook(doc(t));
    ids[t] = id;
  }
  return { adapter, ids };
}

function renderMenu(adapter: LocalAdapter, currentId: string) {
  const loc = { path: "" };
  function Probe() {
    loc.path = useLocation().pathname;
    return null;
  }
  render(
    <MemoryRouter initialEntries={[`/b/${currentId}`]}>
      <Probe />
      <Routes>
        <Route path="/b/:id" element={<SideMenu adapter={adapter} currentId={currentId} />} />
      </Routes>
    </MemoryRouter>,
  );
  return loc;
}

describe("SideMenu — troca rápida de volume", () => {
  it("aberto, lista os volumes como lombadas e marca o atual (LIB-06 AC1/AC4)", async () => {
    const { adapter, ids } = await seedBooks(["Alfa", "Beta", "Gama"]);
    renderMenu(adapter, ids["Beta"]);

    fireEvent.click(screen.getByRole("button", { name: /trocar de volume/i }));

    // os demais aparecem como lombadas acionáveis
    const alfa = await screen.findByRole("button", { name: /Alfa/i });
    const gama = screen.getByRole("button", { name: /Gama/i });
    expect(alfa).toBeEnabled();
    expect(gama).toBeEnabled();

    // o atual aparece marcado como atual e não é acionável
    const beta = screen.getByRole("button", { name: /Beta/i });
    expect(beta).toHaveAttribute("aria-current", "true");
    expect(beta).toBeDisabled();

    // cada lombada carrega a capa (gradiente da surface) para o reveal no hover
    expect(within(alfa).getByText("Alfa")).toBeInTheDocument();
    expect(alfa.querySelector(".app-sidemenu__cover")).toBeTruthy();
  });

  it("acionar uma lombada troca de volume por rota, sem recarregar (LIB-06 AC3)", async () => {
    const { adapter, ids } = await seedBooks(["Alfa", "Beta"]);
    const loc = renderMenu(adapter, ids["Alfa"]);

    fireEvent.click(screen.getByRole("button", { name: /trocar de volume/i }));
    const beta = await screen.findByRole("button", { name: /Beta/i });
    fireEvent.click(beta);

    expect(loc.path).toBe(`/b/${ids["Beta"]}`);
  });

  it("com um volume só, informa em vez de listar vazio (edge case)", async () => {
    const { adapter, ids } = await seedBooks(["Único"]);
    renderMenu(adapter, ids["Único"]);

    fireEvent.click(screen.getByRole("button", { name: /trocar de volume/i }));

    await waitFor(() => expect(screen.getByText(/único volume/i)).toBeInTheDocument());
    // não há pilha de lombadas
    expect(document.querySelector(".app-sidemenu__stack")).toBeNull();
  });
});
