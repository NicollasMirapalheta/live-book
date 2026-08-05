/**
 * T10 — ImportRoute (Out of Scope da spec: "upload exercitado por rota de importacao
 * simples"). Done-when:
 *  - Drop -> processa+sobe -> anexa paginas -> saveBook com rev; conflito nao vira
 *    sobrescrita
 *  - Falha de upload mostra retomar; nenhum asset orfao fica no doc
 *  - Teste de rota (happy + falha parcial) passa
 *
 * O processamento e injetado (seam `processFile`) para rodar sem worker/DOM; o
 * `LocalAdapter` real (fake-indexeddb) cobre getBook/saveBook; `uploadAsset` e
 * espionado para simular sucesso/falha por arquivo.
 */

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ImportView, ImportRoute } from "../ImportRoute";
import { AppRouter } from "../AppRouter";
import { AdapterProvider } from "../AdapterContext";
import { LocalAdapter } from "../../data/local/LocalAdapter";
import { RevConflictError } from "../../data/StorageAdapter";
import { createEmptyDoc, createPage } from "../../book/factory";
import type { ProcessedImage } from "../../media/pipeline";
import type { AssetRef } from "../../book/schema";

function imageFile(name: string): File {
  return new File([new Uint8Array(8)], name, { type: "image/jpeg" });
}

/** processa sem DOM: `lqip` carrega o nome do arquivo, para o upload espionado
 * rastrear qual foto virou qual asset. */
async function fakeProcess(file: File): Promise<ProcessedImage> {
  return {
    page: new Blob([file.name]),
    thumb: new Blob([file.name]),
    lqip: file.name,
    w: 1100,
    h: 800,
  };
}

function renderImport(adapter: LocalAdapter, id: string) {
  return render(
    <AdapterProvider adapter={adapter}>
      <MemoryRouter>
        <ImportView adapter={adapter} id={id} processFile={fakeProcess} />
      </MemoryRouter>
    </AdapterProvider>,
  );
}

async function seedBook(pages = 1) {
  const adapter = new LocalAdapter(`import-${crypto.randomUUID()}`);
  const doc = createEmptyDoc({ title: "Álbum", surface: "album" });
  doc.pages = Array.from({ length: pages }, (_, i) => createPage({ title: `p${i}` }));
  const { id } = await adapter.createBook(doc);
  return { adapter, id };
}

/** upload que devolve um AssetRef por foto; opcionalmente falha para nomes dados. */
function stubUpload(adapter: LocalAdapter, failFor: string[] = []) {
  return vi.spyOn(adapter, "uploadAsset").mockImplementation(
    async (_bookId, img): Promise<AssetRef> => {
      if (failFor.includes(img.lqip)) throw new Error("network down");
      return { id: img.lqip, w: img.w, h: img.h, lqip: img.lqip };
    },
  );
}

describe("ImportRoute — happy path", () => {
  it("dropar fotos anexa uma pagina de imagem por foto e salva com o rev carregado", async () => {
    const { adapter, id } = await seedBook(2);
    stubUpload(adapter);
    const saveSpy = vi.spyOn(adapter, "saveBook");

    renderImport(adapter, id);
    const input = await screen.findByLabelText(/escolher fotos/i);
    fireEvent.change(input, { target: { files: [imageFile("a.jpg"), imageFile("b.jpg")] } });

    await screen.findByRole("heading", { name: /importação concluída/i });

    // saveBook chamado com o rev carregado (1) e o doc com as 2 paginas novas anexadas
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const [savedId, savedDoc, savedRev] = saveSpy.mock.calls[0];
    expect(savedId).toBe(id);
    expect(savedRev).toBe(1);
    expect(savedDoc.pages).toHaveLength(4); // 2 originais + 2 fotos

    // as paginas novas sao blocos de imagem com os assets enviados
    const loaded = await adapter.getBook(id);
    const imgPages = loaded!.doc.pages.slice(2);
    expect(imgPages.map((p) => (p.blocks[0] as { type: string }).type)).toEqual(["image", "image"]);
    expect(imgPages.map((p) => (p.blocks[0] as { asset: AssetRef }).asset.id)).toEqual([
      "a.jpg",
      "b.jpg",
    ]);
  });
});

describe("ImportRoute — falha parcial", () => {
  it("upload que falha no meio: salva so as enviadas, mostra retomar, sem asset orfao no doc", async () => {
    const { adapter, id } = await seedBook(1);
    stubUpload(adapter, ["b.jpg"]); // b falha
    renderImport(adapter, id);

    const input = await screen.findByLabelText(/escolher fotos/i);
    fireEvent.change(input, {
      target: { files: [imageFile("a.jpg"), imageFile("b.jpg"), imageFile("c.jpg")] },
    });

    await screen.findByRole("heading", { name: /importação concluída/i });

    // 2 fotos adicionadas, 1 falhou com botao de retomar
    expect(screen.getByText(/2 fotos adicionadas/i)).toBeInTheDocument();
    const failures = screen.getByText(/1 foto falhou/i).closest("section")!;
    expect(within(failures).getByText(/b\.jpg/)).toBeInTheDocument();
    expect(within(failures).getByRole("button", { name: /retomar/i })).toBeInTheDocument();

    // doc: 1 original + 2 enviadas = 3 paginas; NENHUM asset orfao (b nao virou pagina)
    const loaded = await adapter.getBook(id);
    expect(loaded!.doc.pages).toHaveLength(3);
    const ids = loaded!.doc.pages
      .slice(1)
      .map((p) => (p.blocks[0] as { asset: AssetRef }).asset.id);
    expect(ids).toEqual(["a.jpg", "c.jpg"]);
    expect(ids).not.toContain("b.jpg");
  });

  it("retomar reenvia so a foto que faltou e a anexa no rev atualizado", async () => {
    const { adapter, id } = await seedBook(0);
    const upload = stubUpload(adapter, ["b.jpg"]); // b falha na 1a passada
    renderImport(adapter, id);

    const input = await screen.findByLabelText(/escolher fotos/i);
    fireEvent.change(input, {
      target: { files: [imageFile("a.jpg"), imageFile("b.jpg")] },
    });
    await screen.findByRole("heading", { name: /importação concluída/i });

    // agora b para de falhar; retomar reenvia SO b
    upload.mockImplementation(async (_b, img) => ({
      id: img.lqip,
      w: img.w,
      h: img.h,
      lqip: img.lqip,
    }));
    upload.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /retomar/i }));

    await screen.findByText(/1 foto adicionada/i);
    // so b foi reenviado
    expect(upload).toHaveBeenCalledTimes(1);

    const loaded = await adapter.getBook(id);
    const ids = loaded!.doc.pages.map((p) => (p.blocks[0] as { asset: AssetRef }).asset.id);
    expect(ids).toEqual(["a.jpg", "b.jpg"]);
  });
});

describe("ImportRoute — conflito de rev", () => {
  it("conflito no save mostra aviso e NAO sobrescreve o documento", async () => {
    const { adapter, id } = await seedBook(2);
    stubUpload(adapter);
    vi.spyOn(adapter, "saveBook").mockRejectedValue(new RevConflictError());

    renderImport(adapter, id);
    const input = await screen.findByLabelText(/escolher fotos/i);
    fireEvent.change(input, { target: { files: [imageFile("a.jpg")] } });

    await screen.findByRole("heading", { name: /conflito de versão/i });
    expect(screen.getByText(/nada foi sobrescrito/i)).toBeInTheDocument();

    // documento intacto (o mock impediu a escrita)
    const loaded = await adapter.getBook(id);
    expect(loaded!.doc.pages).toHaveLength(2);
  });
});

describe("ImportRoute — registro no AppRouter", () => {
  it("'/b/:id/import' resolve para a rota de importacao", async () => {
    const { adapter, id } = await seedBook(1);
    render(
      <AdapterProvider adapter={adapter}>
        <MemoryRouter initialEntries={[`/b/${id}/import`]}>
          <AppRouter />
        </MemoryRouter>
      </AdapterProvider>,
    );
    expect(await screen.findByRole("heading", { name: /importar fotos/i })).toBeInTheDocument();
  });

  it("ImportRoute existe como componente conectado ao router", () => {
    // sanidade: o wrapper conectado resolve params e nao lanca
    render(
      <AdapterProvider adapter={new LocalAdapter(`import-${crypto.randomUUID()}`)}>
        <MemoryRouter initialEntries={["/b/xyz/import"]}>
          <Routes>
            <Route path="/b/:id/import" element={<ImportRoute />} />
          </Routes>
        </MemoryRouter>
      </AdapterProvider>,
    );
    expect(screen.getByText(/carregando volume/i)).toBeInTheDocument();
  });
});
