import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shelf } from "../ui/Shelf";
import { Magic } from "../ui/Magic";
import { useAdapter } from "./AdapterContext";
import { StorageUnavailableError, type BookSummary } from "../data/StorageAdapter";
import { MAX_BOOKS } from "../config/limits";

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
        <Magic variant="quiet" />
        <p>Abrindo a biblioteca…</p>
      </main>
    );
  }

  if (state.books.length === 0) {
    return (
      <main className="app-shelf app-shelf--empty">
        <Magic variant="hero" />
        <h1>Sua estante está vazia</h1>
        <p>Seu primeiro livro aparece aqui. Crie um volume e ele ganha um lugar na estante.</p>
        <Link to="/new" className="app-shelf__create">
          Criar volume
        </Link>
      </main>
    );
  }

  // Teto do acervo (AD-033): ao atingir, "Novo volume" desabilita com aviso.
  const atCap = state.books.length >= MAX_BOOKS;

  return (
    <main className="app-shelf">
      <header className="app-shelf__header">
        <h1>Minha biblioteca</h1>
        {atCap ? (
          <span
            className="app-shelf__create is-disabled"
            role="button"
            aria-disabled="true"
            title={`Limite de ${MAX_BOOKS} volumes atingido`}
          >
            Novo volume
          </span>
        ) : (
          <Link to="/new" className="app-shelf__create">
            Novo volume
          </Link>
        )}
      </header>
      {atCap ? (
        <p className="app-shelf__cap-note">
          Você atingiu o limite de {MAX_BOOKS} volumes na estante.
        </p>
      ) : null}
      <Shelf books={state.books} showSlot={!atCap} />
    </main>
  );
}
