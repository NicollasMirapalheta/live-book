import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEmptyDoc, createPage } from "../book/factory";
import { listSurfaces } from "../book/surfaces/registry";
import { encodeRescue, setEditToken } from "../data/editTokens";
import { useAdapter } from "./AdapterContext";
import type { SurfaceId } from "../book/schema";

/** Um volume novo nasce com algumas páginas em branco, para não abrir vazio: dá ao
 * autor "onde escrever" enquanto o editor (Fase 5) não existe. */
const INITIAL_BLANK_PAGES = 5;

/**
 * Criação de volume (LIB-04, DATA-06 / `AD-017`). Escolhe um preset de surface,
 * cria um documento vazio, guarda o `editToken` e exibe o LINK DE RESGATE uma única
 * vez — a única recuperação da permissão de edição se o autor limpar o navegador
 * (o token vive só em `localStorage`). A autoria de conteúdo é a Fase 4.
 */

type Phase =
  | { step: "choose" }
  | { step: "creating" }
  | { step: "created"; id: string; rescue: string };

export function NewBookRoute() {
  const adapter = useAdapter();
  const navigate = useNavigate();
  const surfaces = listSurfaces();
  const [surface, setSurface] = useState<SurfaceId>(surfaces[0]?.id ?? "manuscript");
  const [phase, setPhase] = useState<Phase>({ step: "choose" });

  async function handleCreate() {
    setPhase({ step: "creating" });
    const doc = createEmptyDoc({
      surface,
      pages: Array.from({ length: INITIAL_BLANK_PAGES }, () => createPage({})),
    });
    const { id, editToken } = await adapter.createBook(doc);
    setEditToken(id, editToken); // permissão de edição, por volume
    const rescue = `${window.location.origin}/${encodeRescue(id, editToken)}`;
    setPhase({ step: "created", id, rescue });
  }

  if (phase.step === "created") {
    return (
      <main className="app-new app-new--created">
        <h1>Volume criado</h1>
        <p>
          Guarde este link de resgate <strong>fora do navegador</strong>. É a única forma de
          recuperar a permissão de edição se você limpar este navegador — ele não será
          mostrado de novo.
        </p>
        <code className="app-new__rescue">{phase.rescue}</code>
        <button type="button" onClick={() => navigate(`/b/${phase.id}`)}>
          Abrir volume
        </button>
      </main>
    );
  }

  const creating = phase.step === "creating";
  return (
    <main className="app-new">
      <h1>Novo volume</h1>
      <label className="app-new__field">
        Estilo
        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          disabled={creating}
        >
          {surfaces.length === 0 ? (
            <option value="manuscript">Manuscript</option>
          ) : (
            surfaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))
          )}
        </select>
      </label>
      <button type="button" onClick={handleCreate} disabled={creating}>
        Criar
      </button>
    </main>
  );
}
