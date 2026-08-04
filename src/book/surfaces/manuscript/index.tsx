/**
 * Surface `manuscript` — texto corrido (DOC-08, AD-007).
 *
 * E o que o demo atual ja e, entao serve de referencia para as demais surfaces.
 * Usa SO os blocos de nucleo (nenhum exclusivo). O tema espelha exatamente a
 * paleta padrao de live-book.css, para o volume renderizado ficar indistinguivel
 * da versao atual.
 */
import { registerSurface, type SurfaceDef } from "../registry";

export const manuscript: SurfaceDef = {
  id: "manuscript",
  label: "Manuscrito",
  // sem `blocks`: manuscript usa apenas o nucleo
  theme: {
    bg: "#efe9dd",
    bgDeep: "#e3dccc",
    paper: "#fdfbf6",
    paper2: "#f7f1e6",
    ink: "#3a3247",
    inkSoft: "#6f6684",
    accent: "#7a55d1",
    accent2: "#a98bf0",
    tint: "#efe8ff",
    radius: "20px",
  },
  layouts: [
    {
      id: "flow",
      label: "Texto corrido",
      seed: () => [],
    },
  ],
  // Texto puro, sem imagem: o raio padrao do motor (4) mantem o demo identico.
  defaultWindowRadius: 4,
};

registerSurface(manuscript);
