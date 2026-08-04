import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "../AppRouter";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";

// LIB-01 (T1/T6): tabela de rotas + rota desconhecida. Verificação estrutural — as
// rotas conhecidas resolvem para seus componentes (estante/criação/compartilhamento
// ainda placeholders; leitor já é o real após T6) e a rota `*` sempre oferece o
// caminho de volta à estante.

function renderAt(path: string) {
  return render(
    <AdapterProvider adapter={new LocalAdapter(`approuter-${crypto.randomUUID()}`)}>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter />
      </MemoryRouter>
    </AdapterProvider>,
  );
}

describe("AppRouter", () => {
  it("rota desconhecida renderiza 'não encontrado'", () => {
    renderAt("/rota/que/nao/existe");
    expect(screen.getByRole("heading", { name: /não encontrado/i })).toBeInTheDocument();
  });

  it("a rota desconhecida oferece um link de volta à estante (href='/')", () => {
    renderAt("/rota/que/nao/existe");
    const link = screen.getByRole("link", { name: /estante/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("'/' resolve para a estante (ShelfRoute)", () => {
    renderAt("/");
    expect(screen.getByText(/carregando a estante/i)).toBeInTheDocument();
  });

  it("'/new' resolve para a criação de volume (NewBookRoute)", () => {
    renderAt("/new");
    expect(screen.getByRole("heading", { name: /novo volume/i })).toBeInTheDocument();
  });

  it("'/b/:id' resolve para o leitor (ReaderShell)", () => {
    renderAt("/b/abc-123");
    expect(screen.getByText(/carregando volume/i)).toBeInTheDocument();
  });

  it("'/b/:id/p/:page' resolve para o leitor", () => {
    renderAt("/b/abc-123/p/5");
    expect(screen.getByText(/carregando volume/i)).toBeInTheDocument();
  });

  it("'/b/:id/c/:slug' resolve para o leitor", () => {
    renderAt("/b/abc-123/c/intro");
    expect(screen.getByText(/carregando volume/i)).toBeInTheDocument();
  });

  it("'/s/:token' resolve para o leitor público (ReaderShell)", () => {
    renderAt("/s/tok-123");
    expect(screen.getByText(/carregando volume/i)).toBeInTheDocument();
  });
});
