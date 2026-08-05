/**
 * Surface `album` — apresentacao de fotos (MEDIA-06, AD-004/AD-023).
 *
 * Tema proprio, margens estreitas (`chrome.margin: "tight"`) e `defaultWindowRadius:
 * 2` (AD-014: com foto, raio 2 monta no maximo 10 faces, ~36 MB de textura).
 *
 * Registro puramente aditivo: `registerSurface` + `blockTableFor` (nucleo ∪
 * `blocks`) — o renderer, o registry e o motor nao ganham nenhum ramo `album`
 * (MEDIA-06 AC5). A unica costura com o app e o import lateral que da o side-effect
 * de registro, exatamente como `manuscript` faz.
 *
 * Layouts e blocos exclusivos entram em T12/T13/T14; aqui fica so o esqueleto.
 */
import { registerSurface, type SurfaceDef } from "../registry";
import { albumBlocks } from "./blocks";
import { albumLayouts } from "./layouts";
import "./album.css";

export const album: SurfaceDef = {
  id: "album",
  label: "Álbum",
  blocks: albumBlocks,
  theme: {
    bg: "#e8e4de",
    bgDeep: "#d8d2c8",
    paper: "#fffdf9",
    paper2: "#f4efe6",
    ink: "#2e2a2a",
    inkSoft: "#6b6460",
    accent: "#b5745a",
    accent2: "#d9a184",
    tint: "#f2e7df",
    radius: "10px",
  },
  chrome: { margin: "tight" },
  layouts: albumLayouts,
  // Foto queima VRAM: raio 2 mantem <=10 faces montadas (AD-014).
  defaultWindowRadius: 2,
};

registerSurface(album);
