import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shelf } from "../ui/Shelf";
import { useAdapter } from "./AdapterContext";
import { StorageUnavailableError, type BookSummary } from "../data/StorageAdapter";

/**
 * Home = estante (LIB-04/LIB-05). Lista os volumes via `adapter.listBooks()` —
 * SÓ `BookSummary`, NUNCA `getBook` (invariante 6): 40 documentos de 180 KB para
 * desenhar 40 capas seria absurdo.
 *
 * Estados: carregando (nunca tela em branco), vazio (com ação de criar) e lista.
 */

type ShelfState =
  | { status: "loading" }
  | { status: "ready"; books: BookSummary[] };

export function ShelfRoute() {
  const adapter = useAdapter();
  const [state, setState] = useState<ShelfState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    adapter
      .listBooks()
      .then((books) => {
        if (alive) setState({ status: "ready", books });
      })
      .catch((err) => {
        // Backend pausado/rede fora → segue carregando, nunca tela em branco.
        if (err instanceof StorageUnavailableError) return;
        if (alive) setState({ status: "ready", books: [] });
      });
    return () => {
      alive = false;
    };
  }, [adapter]);

  if (state.status === "loading") {
    return (
      <main className="app-shelf app-shelf--loading" aria-busy="true">
        <p>Carregando a estante…</p>
      </main>
    );
  }

  if (state.books.length === 0) {
    return (
      <main className="app-shelf app-shelf--empty">
        <h1>Sua estante está vazia</h1>
        <p>Nenhum volume ainda. Que tal criar o primeiro?</p>
        <Link to="/new" className="app-shelf__create">
          Criar volume
        </Link>
      </main>
    );
  }

  return (
    <main className="app-shelf">
      <header className="app-shelf__header">
        <h1>Estante</h1>
        <Link to="/new" className="app-shelf__create">
          Novo volume
        </Link>
      </header>
      <Shelf books={state.books} />
    </main>
  );
}
