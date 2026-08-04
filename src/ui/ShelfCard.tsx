import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { getSurface } from "../book/surfaces/registry";
import type { BookSummary } from "../data/StorageAdapter";

/**
 * Cartão de um volume na estante. É um link real (`<a href>`), portanto focável por
 * teclado — o anel de foco visível é responsabilidade do CSS (`:focus-visible`).
 *
 * A capa usa o GRADIENTE da surface (imagens/capa real são Fase 3): as cores saem do
 * tema da surface, sem paleta nova. A estante nunca carrega o `BookDoc` — só o
 * `BookSummary` (invariante 6 / LIB-05).
 */
export function ShelfCard({ book }: { book: BookSummary }) {
  const theme = getSurface(book.surface).theme;
  const from = theme.cover ?? theme.accent ?? theme.bgDeep ?? "#5b6472";
  const to = theme.accent2 ?? theme.tint ?? theme.bg ?? "#2b3040";
  const coverStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${from}, ${to})`,
  };

  return (
    <li className="app-shelf__item">
      <Link to={`/b/${book.id}`} className="app-shelf-card">
        <span className="app-shelf-card__cover" style={coverStyle} aria-hidden="true" />
        <span className="app-shelf-card__body">
          <span className="app-shelf-card__title">{book.title}</span>
          {book.subtitle ? (
            <span className="app-shelf-card__subtitle">{book.subtitle}</span>
          ) : null}
          <span className="app-shelf-card__meta">
            {book.pageCount} {book.pageCount === 1 ? "página" : "páginas"}
          </span>
        </span>
      </Link>
    </li>
  );
}
