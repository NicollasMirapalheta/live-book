import { ShelfCard } from "./ShelfCard";
import type { BookSummary } from "../data/StorageAdapter";

/**
 * Grade de volumes da estante — apresentacional puro. Recebe `BookSummary[]`
 * (nunca `BookDoc`, LIB-05) e desenha um cartão por volume.
 */
export function Shelf({ books }: { books: BookSummary[] }) {
  return (
    <ul className="app-shelf__grid">
      {books.map((book) => (
        <ShelfCard key={book.id} book={book} />
      ))}
    </ul>
  );
}
