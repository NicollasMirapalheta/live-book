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
  // Tema amadeirado (AD-031): a mesa é madeira quente (bg), o papel é a coisa clara,
  // acento brasa. O fundo do palco (abajur/vinheta/grão) mora em live-book.css e usa
  // estes bg/bg-deep como base da madeira.
  theme: {
    bg: "#6e4826",
    bgDeep: "#3a2413",
    paper: "#faf3e2",
    paper2: "#f1e2c6",
    ink: "#2a1e14",
    inkSoft: "#6e5a45",
    accent: "#b5622a",
    accent2: "#c9824a",
    tint: "#efe0cd",
    cover: "linear-gradient(158deg, #9a6534 0%, #6e4826 52%, #46290f 100%)",
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
