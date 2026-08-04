import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShelfRoute } from "../ShelfRoute";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../../book/schema";

// LIB-04/LIB-05 (T8): estante lista BookSummary (capa/título/metadados), com estados
// vazio (ação de criar) e carregando. Nenhum getBook na montagem.

function doc(title: string, pages: number, surface = "manuscript"): BookDoc {
  const list: BookPage[] = Array.from({ length: pages }, (_, i) => ({
    id: `p${i}`,
    blocks: [],
  }));
  return { schemaVersion: SCHEMA_VERSION, id: "x", title, surface, pages: list };
}

function renderShelf(adapter: LocalAdapter) {
  return render(
    <AdapterProvider adapter={adapter}>
      <MemoryRouter>
        <ShelfRoute />
      </MemoryRouter>
    </AdapterProvider>,
  );
}

describe("estante (ShelfRoute)", () => {
  it("lista os volumes com capa, título e metadados (LIB-04 AC1)", async () => {
    const adapter = new LocalAdapter(`shelf-${crypto.randomUUID()}`);
    const a = await adapter.createBook(doc("Álbum de Viagem", 3));
    await adapter.createBook(doc("Diário", 1));

    const { container } = renderShelf(adapter);

    // título
    const cardA = await screen.findByRole("link", { name: /Álbum de Viagem/i });
    expect(cardA).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Diário/i })).toBeInTheDocument();

    // link para o volume (href por id)
    expect(cardA).toHaveAttribute("href", `/b/${a.id}`);

    // metadados: contagem de páginas
    expect(within(cardA).getByText(/3 páginas/i)).toBeInTheDocument();

    // capa: gradiente da surface
    const cover = cardA.querySelector(".app-shelf-card__cover") as HTMLElement;
    expect(cover).toBeTruthy();
    expect(cover.style.background).toContain("linear-gradient");

    // grade tem exatamente 2 cartões
    expect(container.querySelectorAll(".app-shelf-card")).toHaveLength(2);
  });

  it("estado vazio mostra ação de criar (LIB-04 AC2)", async () => {
    const adapter = new LocalAdapter(`shelf-${crypto.randomUUID()}`);
    renderShelf(adapter);

    const create = await screen.findByRole("link", { name: /criar volume/i });
    expect(create).toHaveAttribute("href", "/new");
    expect(screen.getByText(/estante está vazia/i)).toBeInTheDocument();
  });

  it("mostra estado de carregamento, não tela em branco (LIB-04 AC3)", () => {
    const adapter = new LocalAdapter(`shelf-${crypto.randomUUID()}`);
    renderShelf(adapter);
    // Síncrono, antes de listBooks resolver.
    expect(screen.getByText(/carregando a estante/i)).toBeInTheDocument();
  });

  it("na montagem NENHUM getBook é chamado — só listBooks (LIB-05 AC5)", async () => {
    const adapter = new LocalAdapter(`shelf-${crypto.randomUUID()}`);
    await adapter.createBook(doc("Caderno", 2));
    const getBookSpy = vi.spyOn(adapter, "getBook");
    const listSpy = vi.spyOn(adapter, "listBooks");

    renderShelf(adapter);
    await screen.findByRole("link", { name: /Caderno/i });

    expect(listSpy).toHaveBeenCalled();
    expect(getBookSpy).not.toHaveBeenCalled();
  });
});
