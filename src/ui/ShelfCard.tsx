import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { getSurface } from "../book/surfaces/registry";
import type { BookSummary } from "../data/StorageAdapter";

/**
 * Uma **lombada** na estante (AD-031/AD-033): o usuário tira um livro, não clica num
 * card. É um `<Link>` real (focável por teclado; anel de foco no CSS). A cor sai do
 * tema da surface — sem paleta nova. A estante nunca carrega `BookDoc`, só `BookSummary`.
 *
 * Altura variada por volume (derivada do id, deterministica) para a fileira parecer uma
 * estante de verdade. Título vertical na face; metadado acessível (lido por leitor de
 * tela e exibido no balão de T5).
 */

/** Altura da lombada em px, deterministica a partir do id (250..345). Lombadas
 * grandes: a estante fica PERTO, presente — não um objeto distante na sala. */
function spineHeight(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 250 + (h % 96);
}

export function ShelfCard({ book }: { book: BookSummary }) {
  const theme = getSurface(book.surface).theme;
  const from = theme.cover ?? theme.accent ?? theme.bgDeep ?? "#7c4a24";
  const to = theme.accent2 ?? theme.tint ?? theme.bg ?? "#5f3c20";
  const spineStyle: CSSProperties = {
    height: `${spineHeight(book.id)}px`,
    background: `linear-gradient(90deg, ${from}, ${to} 68%, rgba(0,0,0,.28))`,
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
