import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRouter } from "../AppRouter";

// LIB-01 (T1): tabela de rotas + rota desconhecida. Verificação estrutural — as
// rotas conhecidas resolvem para seus componentes (placeholders por ora) e a rota
// `*` sempre oferece o caminho de volta à estante.

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRouter />
    </MemoryRouter>,
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

  it("'/' resolve para a estante", () => {
    renderAt("/");
    expect(screen.getByTestId("route-shelf")).toBeInTheDocument();
  });

  it("'/new' resolve para a criação de volume", () => {
    renderAt("/new");
    expect(screen.getByTestId("route-new")).toBeInTheDocument();
  });

  it("'/b/:id' resolve para o leitor", () => {
    renderAt("/b/abc-123");
    expect(screen.getByTestId("route-reader")).toBeInTheDocument();
  });

  it("'/b/:id/p/:page' resolve para o leitor", () => {
    renderAt("/b/abc-123/p/5");
    expect(screen.getByTestId("route-reader")).toBeInTheDocument();
  });

  it("'/b/:id/c/:slug' resolve para o leitor", () => {
    renderAt("/b/abc-123/c/intro");
    expect(screen.getByTestId("route-reader")).toBeInTheDocument();
  });

  it("'/s/:token' resolve para o leitor público", () => {
    renderAt("/s/tok-123");
    expect(screen.getByTestId("route-share")).toBeInTheDocument();
  });
});
