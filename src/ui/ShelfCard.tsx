import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { BookSummary } from "../data/StorageAdapter";

/**
 * Uma **lombada** na estante (AD-031/AD-033): o usuário tira um livro, não clica num
 * card. É um `<Link>` real (focável por teclado; anel de foco no CSS). A cor da lombada
 * sai de uma paleta de capas variadas (indexada pelo id), para a fileira parecer uma
 * estante de verdade e destacar da madeira escura do fundo. A estante nunca carrega
 * `BookDoc`, só `BookSummary`.
 *
 * Altura variada por volume (derivada do id, deterministica); título vertical na face;
 * metadado no balão (T5).
 */

/** Paleta de "capas" — tons quentes ricos (com uns poucos frios/oliva) que saltam da
 * madeira escura. Indexada pelo id, para variedade estável entre renders. */
const SPINES = [
  "#b5622a", "#6f7f3f", "#c08a2e", "#8a3f2f", "#4f7a56",
  "#a86a34", "#8a4a5a", "#5a6f8a", "#b0824a", "#7a5a8a",
  "#9a5a3a", "#5f7f4c",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Altura da lombada em px (250..345). Lombadas grandes: a estante fica presente. */
function spineHeight(hash: number): number {
  return 250 + (hash % 96);
}

/** Clareia/escurece um hex em `pct` (aprox.), para o gradiente 3D da lombada. */
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (x: number) => Math.max(0, Math.min(255, x + Math.round(255 * pct / 100)));
  return `rgb(${clamp((n >> 16) & 255)}, ${clamp((n >> 8) & 255)}, ${clamp(n & 255)})`;
}

export function ShelfCard({ book }: { book: BookSummary }) {
  const hash = hashId(book.id);
  const base = SPINES[hash % SPINES.length];
  const spineStyle: CSSProperties = {
    height: `${spineHeight(hash)}px`,
    background: `linear-gradient(90deg, ${shade(base, -18)}, ${base} 34%, ${shade(base, 8)} 70%, ${shade(base, -24)})`,
  };
  const pages = `${book.pageCount} ${book.pageCount === 1 ? "página" : "páginas"}`;

  return (
    <li className="app-shelf__book">
      <Link
        to={`/b/${book.id}`}
        className="app-shelf__spine"
        style={spineStyle}
        aria-label={`${book.title} — ${pages}`}
      >
        <span className="app-shelf__spine-title">{book.title}</span>
        {/* balão de papel ao mirar/focar (T5); o nome acessível já vem do aria-label */}
        <span className="app-shelf__tip" aria-hidden="true">
          <span className="app-shelf__tip-title">{book.title}</span>
          <span className="app-shelf__tip-meta">{pages}</span>
        </span>
      </Link>
    </li>
  );
}
