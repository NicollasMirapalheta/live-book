import { Link } from "react-router-dom";
import { ShelfCard } from "./ShelfCard";
import type { BookSummary } from "../data/StorageAdapter";

/**
 * A estante frontal (AD-033): uma prateleira de madeira com as lombadas dos volumes.
 * A largura **acompanha o acervo** — o `__unit` é inline e abraça as lombadas + folga,
 * e a `__plank` cobre essa largura. Um slot pontilhado "＋" convida ao próximo volume
 * (oculto no teto). Apresentacional puro; recebe `BookSummary[]` (nunca `BookDoc`).
 */
export function Shelf({ books, showSlot = true }: { books: BookSummary[]; showSlot?: boolean }) {
  return (
    <div className="app-shelf__stage">
      <div className="app-shelf__unit">
        <ul className="app-shelf__row">
          {books.map((book) => (
            <ShelfCard key={book.id} book={book} />
          ))}
          {showSlot ? (
            <li className="app-shelf__slot-item">
              <Link to="/new" className="app-shelf__slot" aria-label="Adicionar volume">
                <span aria-hidden="true">+</span>
              </Link>
            </li>
          ) : null}
        </ul>
        <span className="app-shelf__plank" aria-hidden="true" />
      </div>
    </div>
  );
}
