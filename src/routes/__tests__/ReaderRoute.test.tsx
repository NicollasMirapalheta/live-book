import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReaderShell } from "../ReaderRoute";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { SCHEMA_VERSION, type BookDoc, type BookPage } from "../../book/schema";

// LIB-01 (T4): ReaderShell carrega o volume pelo adapter, passa por loadForRender
// (AD-026) e monta o motor abrindo na página da URL. Estados carregando/não-encontrado.

function textDoc(pages: BookPage[]): BookDoc {
  return { schemaVersion: SCHEMA_VERSION, id: "x", title: "Vol Teste", surface: "manuscript", pages };
}

function numberedPages(n: number): BookPage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    blocks: [{ id: `b${i}`, type: "text", html: `<p>corpo da pagina ${i + 1}</p>` }],
  }));
}

/** Semeia um doc no LocalAdapter e devolve `{ adapter, id }`. */
async function seed(doc: BookDoc) {
  const adapter = new LocalAdapter(`reader-test-${crypto.randomUUID()}`);
  const { id } = await adapter.createBook(doc);
  return { adapter, id };
}

function renderShell(adapter: LocalAdapter, id: string, page?: string) {
  return render(
    <MemoryRouter>
      <ReaderShell adapter={adapter} id={id} page={page} />
    </MemoryRouter>,
  );
}

describe("ReaderShell — carga e montagem", () => {
  it("carrega o volume e abre na página impressa :n (LIB-01 AC1)", async () => {
    const { adapter, id } = await seed(textDoc(numberedPages(10)));
    const { container } = renderShell(adapter, id, "5");

    // O rótulo de progresso do motor mostra o número impresso do recto do spread
    // aberto. Abrir em /p/5 (folha 3) mostra o par 4–5 → readNumber 5.
    await waitFor(() => {
      const label = container.querySelector(".lb-progress__label")?.textContent ?? "";
      expect(label).toContain("5/10");
    });
  });

  it("oferece voltar à biblioteca (link para /)", async () => {
    const { adapter, id } = await seed(textDoc(numberedPages(4)));
    renderShell(adapter, id, "1");
    const back = await screen.findByRole("link", { name: /biblioteca/i });
    expect(back).toHaveAttribute("href", "/");
  });

  it("sem :n (rota /b/:id) abre na capa, não no miolo", async () => {
    const { adapter, id } = await seed(textDoc(numberedPages(10)));
    const { container } = renderShell(adapter, id);
    await waitFor(() => {
      const label = container.querySelector(".lb-progress__label")?.textContent ?? "";
      expect(label).toContain("Capa");
    });
  });

  it("o doc renderizado passou por loadForRender: <script> do html autoral é removido (paga AD-026)", async () => {
    const { adapter, id } = await seed(
      textDoc([
        {
          id: "p0",
          blocks: [
            {
              id: "b0",
              type: "text",
              html: `<p>corpo seguro</p><script>document.title='pwned'</script>`,
            },
          ],
        },
      ]),
    );
    const { container } = renderShell(adapter, id, "1");

    await waitFor(() => expect(screen.getByText("corpo seguro")).toBeInTheDocument());
    // Sem loadForRender, o <script> autoral iria cru ao DOM (dangerouslySetInnerHTML).
    expect(container.querySelector("script")).toBeNull();
    expect(document.title).not.toBe("pwned");
  });

  it("id inexistente → 'não encontrado' com volta à estante (edge case)", async () => {
    const adapter = new LocalAdapter(`reader-test-${crypto.randomUUID()}`);
    renderShell(adapter, "nao-existe");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /não encontrado/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /estante/i })).toHaveAttribute("href", "/");
  });

  it("enquanto carrega mostra estado de carregamento, não tela em branco", () => {
    const adapter = new LocalAdapter(`reader-test-${crypto.randomUUID()}`);
    renderShell(adapter, "qualquer");
    // Síncrono, antes do getBook resolver: há um estado de carregando visível.
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });
});

describe("ReaderShell — afordância de volume vazio (SHELL-05)", () => {
  it("volume sem miolo mostra aviso com link para importar fotos", async () => {
    const { adapter, id } = await seed(textDoc([]));
    renderShell(adapter, id);
    const link = await screen.findByRole("link", { name: /adicionar fotos/i });
    expect(link).toHaveAttribute("href", `/b/${id}/import`);
  });

  it("volume com ao menos uma página NÃO mostra o aviso de vazio", async () => {
    const { adapter, id } = await seed(textDoc(numberedPages(1)));
    const { container } = renderShell(adapter, id);
    // espera o motor montar (rótulo de progresso presente) antes de afirmar ausência
    await waitFor(() =>
      expect(container.querySelector(".lb-progress__label")).not.toBeNull(),
    );
    expect(screen.queryByRole("link", { name: /adicionar fotos/i })).toBeNull();
  });
});
