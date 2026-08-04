import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppRouter } from "../AppRouter";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc } from "../../book/schema";

// LIB-01 AC6 / LIB-03 (T7): leitor público /s/:token. Abre em leitura via
// PublicAdapter (canWrite=false); NENHUM controle de edição no DOM.

const doc: BookDoc = {
  schemaVersion: SCHEMA_VERSION,
  id: "x",
  title: "Compartilhado",
  surface: "manuscript",
  pages: [
    { id: "p0", blocks: [{ id: "b0", type: "text", html: "<p>conteudo compartilhado</p>" }] },
    { id: "p1", blocks: [{ id: "b1", type: "text", html: "<p>segunda pagina</p>" }] },
  ],
};

/** Semeia o doc num LocalAdapter (a ReadSource sobre a qual o ShareRoute constrói o
 * PublicAdapter) e monta o app na rota /s/:token, com o token = id do volume. */
async function mountShare() {
  const source = new LocalAdapter(`share-${crypto.randomUUID()}`);
  const { id } = await source.createBook(doc);
  render(
    <AdapterProvider adapter={source}>
      <MemoryRouter initialEntries={[`/s/${id}`]}>
        <AppRouter />
      </MemoryRouter>
    </AdapterProvider>,
  );
  return { id };
}

describe("leitor público /s/:token", () => {
  it("abre o volume em leitura (LIB-01 AC6)", async () => {
    await mountShare();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Compartilhado" })).toBeInTheDocument(),
    );
    // O conteúdo do miolo é lido através do PublicAdapter → LocalAdapter semeado.
    expect(screen.getByText("conteudo compartilhado")).toBeInTheDocument();
  });

  it("não expõe nenhum controle de edição no DOM (canWrite=false)", async () => {
    await mountShare();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Compartilhado" })).toBeInTheDocument(),
    );

    // Nenhum campo editável.
    expect(document.querySelectorAll('[contenteditable="true"]')).toHaveLength(0);

    // Nenhum controle de escrita/edição entre os botões do leitor.
    const editControls = screen
      .queryAllByRole("button")
      .filter((b) => /editar|salvar|excluir|apagar|edit|save|delete/i.test(b.textContent ?? "") ||
        /editar|salvar|excluir|apagar|edit|save|delete/i.test(b.getAttribute("aria-label") ?? ""));
    expect(editControls).toHaveLength(0);
  });

  it("continua sendo um leitor funcional: a navegação de leitura está presente", async () => {
    await mountShare();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Compartilhado" })).toBeInTheDocument(),
    );
    // Virar página é leitura, não edição — permanece disponível.
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeInTheDocument();
  });

  it("token inexistente → 'não encontrado', sem controle de edição", async () => {
    const source = new LocalAdapter(`share-${crypto.randomUUID()}`);
    render(
      <AdapterProvider adapter={source}>
        <MemoryRouter initialEntries={["/s/nao-existe"]}>
          <Routes>
            <Route path="/*" element={<AppRouter />} />
          </Routes>
        </MemoryRouter>
      </AdapterProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /não encontrado/i })).toBeInTheDocument(),
    );
    expect(document.querySelectorAll('[contenteditable="true"]')).toHaveLength(0);
  });
});
