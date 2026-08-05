import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { createBlock, createPage } from "../book/factory";
import type { BookDoc } from "../book/schema";
import { RevConflictError, StorageUnavailableError, type StorageAdapter } from "../data/StorageAdapter";
import {
  uploadBatch,
  type BatchFailure,
  type BatchProgress,
} from "../ingest/uploadBatch";
import type { ProcessedImage } from "../media/pipeline";
import { useAdapter } from "./AdapterContext";

/**
 * Rota de importacao simples (T10, Out of Scope da spec: "upload exercitado por rota
 * de importacao simples"). Dropar/escolher fotos num volume existente ->
 * `uploadBatch` -> anexar UMA pagina de imagem por foto enviada -> `saveBook` com o
 * `rev` carregado.
 *
 * Integridade: as paginas saem SO de `result.uploaded` (assets confirmados), entao
 * nenhum asset orfao entra no doc; foto que falhou nao vira pagina e fica na lista de
 * retomar. Conflito de `rev` NUNCA vira sobrescrita (invariante 8): mostra aviso.
 */

type State =
  | { step: "loading" }
  | { step: "not-found" }
  | { step: "idle"; doc: BookDoc; rev: number }
  | { step: "working"; progress?: BatchProgress }
  | {
      step: "result";
      doc: BookDoc;
      rev: number;
      added: number;
      failedFiles: File[];
      failures: BatchFailure[];
    }
  | { step: "conflict" };

export function ImportRoute() {
  const { id } = useParams();
  const adapter = useAdapter();
  return <ImportView adapter={adapter} id={id ?? ""} />;
}

export interface ImportViewProps {
  adapter: StorageAdapter;
  id: string;
  /** seam de teste: processa UM arquivo (default = pipeline real com worker/DOM). */
  processFile?: (file: File) => Promise<ProcessedImage>;
}

export function ImportView({ adapter, id, processFile }: ImportViewProps) {
  const [state, setState] = useState<State>({ step: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ step: "loading" });
    adapter
      .getBook(id)
      .then((loaded) => {
        if (!alive) return;
        if (!loaded) setState({ step: "not-found" });
        else setState({ step: "idle", doc: loaded.doc, rev: loaded.rev });
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof StorageUnavailableError) return; // segue carregando
        setState({ step: "not-found" });
      });
    return () => {
      alive = false;
    };
  }, [adapter, id]);

  const runImport = useCallback(
    async (files: File[], doc: BookDoc, rev: number) => {
      setState({ step: "working" });
      const result = await uploadBatch(
        files,
        id,
        adapter,
        (progress) => setState({ step: "working", progress }),
        processFile ? { process: processFile } : undefined,
      );

      // Uma pagina de imagem por asset CONFIRMADO — nunca por foto que falhou.
      const newPages = result.uploaded.map((asset) =>
        createPage({ blocks: [createBlock("image", { asset })] }),
      );

      let savedDoc = doc;
      let savedRev = rev;
      if (newPages.length > 0) {
        const nextDoc: BookDoc = { ...doc, pages: [...doc.pages, ...newPages] };
        try {
          const res = await adapter.saveBook(id, nextDoc, rev);
          savedDoc = nextDoc;
          savedRev = res.rev;
        } catch (err) {
          if (err instanceof RevConflictError) {
            setState({ step: "conflict" });
            return;
          }
          throw err;
        }
      }

      const failedFiles = files.filter((f) =>
        result.failed.some((x) => x.file === f.name),
      );
      setState({
        step: "result",
        doc: savedDoc,
        rev: savedRev,
        added: newPages.length,
        failedFiles,
        failures: result.failed,
      });
    },
    [adapter, id, processFile],
  );

  if (state.step === "loading") {
    return (
      <main className="app-import app-import--loading" aria-busy="true">
        <p>Carregando volume…</p>
      </main>
    );
  }

  if (state.step === "not-found") {
    return (
      <main className="app-import app-import--notfound">
        <h1>Volume não encontrado</h1>
        <p>Este volume não existe ou foi removido.</p>
        <Link to="/">Voltar à estante</Link>
      </main>
    );
  }

  if (state.step === "conflict") {
    return (
      <main className="app-import app-import--conflict">
        <h1>Conflito de versão</h1>
        <p>
          Este volume foi alterado em outro lugar. Recarregue para pegar a versão mais
          recente antes de importar de novo — nada foi sobrescrito.
        </p>
        <Link to={`/b/${id}/import`}>Recarregar</Link>
      </main>
    );
  }

  if (state.step === "working") {
    const p = state.progress;
    return (
      <main className="app-import app-import--working" aria-busy="true">
        <h1>Importando fotos</h1>
        <p role="status">
          {p ? `${p.done} de ${p.total} (${p.uploaded} enviadas, ${p.failed} falharam)` : "Processando…"}
        </p>
      </main>
    );
  }

  if (state.step === "result") {
    const { added, failures, failedFiles, doc, rev } = state;
    return (
      <main className="app-import app-import--result">
        <h1>Importação concluída</h1>
        <p>
          {added} {added === 1 ? "foto adicionada" : "fotos adicionadas"} ao volume.
        </p>
        {failures.length > 0 ? (
          <section className="app-import__failures">
            <p>
              {failures.length} {failures.length === 1 ? "foto falhou" : "fotos falharam"}:
            </p>
            <ul>
              {failures.map((f) => (
                <li key={f.file}>
                  {f.file} — {f.reason}
                </li>
              ))}
            </ul>
            {failedFiles.length > 0 ? (
              <button type="button" onClick={() => void runImport(failedFiles, doc, rev)}>
                Retomar
              </button>
            ) : null}
          </section>
        ) : null}
        <Link to={`/b/${id}`}>Abrir volume</Link>
      </main>
    );
  }

  // idle: pronta para receber fotos.
  const { doc, rev } = state;
  const onFiles = (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length > 0) void runImport(files, doc, rev);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };

  return (
    <main className="app-import">
      <h1>Importar fotos</h1>
      <p>Adicione fotos a “{doc.title}”. Cada foto vira uma página.</p>
      <label className="app-import__pick">
        Escolher fotos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      <div
        className="app-import__drop"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        Arraste fotos aqui
      </div>
    </main>
  );
}
