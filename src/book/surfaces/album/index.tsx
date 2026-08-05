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
  // Mesa amadeirada como o resto da plataforma (AD-031): bg/bgDeep são a madeira
  // (o fundo do palco recebe abajur/vinheta em live-book.css). O papel fica neutro,
  // de propósito, para não tingir as fotos.
  theme: {
    bg: "#6e4826",
    bgDeep: "#3a2413",
    paper: "#fffdf9",
    paper2: "#f4efe6",
    ink: "#2e2a2a",
    inkSoft: "#6b6460",
    accent: "#b5622a",
    accent2: "#c9824a",
    tint: "#f2e7df",
    cover: "linear-gradient(158deg, #a86a34 0%, #7a4e2b 52%, #4a2c14 100%)",
    radius: "10px",
  },
  chrome: { margin: "tight" },
  layouts: albumLayouts,
  // Foto queima VRAM: raio 2 mantem <=10 faces montadas (AD-014).
  defaultWindowRadius: 2,
};

registerSurface(album);
