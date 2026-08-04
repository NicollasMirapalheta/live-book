import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getSurface } from "../book/surfaces/registry";
import {
  StorageUnavailableError,
  type BookSummary,
  type StorageAdapter,
} from "../data/StorageAdapter";

/**
 * Troca rápida de volume no leitor (LIB-06). Uma pilha de lombadas dos volumes;
 * hover/foco desliza a lombada para fora e revela a capa (reveal é CSS). Acionar
 * troca de volume por ROTA (`navigate`), sem recarregar a página. O volume atual
 * fica marcado; com um volume só, informa em vez de listar vazio.
 *
 * Vive em `src/ui/` — IRMÃO do motor, nunca dentro de `src/live-book/` (LIB-06 AC5):
 * o motor não conhece produto em volta dele.
 */
export interface SideMenuProps {
  adapter: StorageAdapter;
  /** id do volume em leitura — marca o atual e o separa dos demais. */
  currentId: string;
}

function coverStyle(surface: string): CSSProperties {
  const theme = getSurface(surface).theme;
  const from = theme.cover ?? theme.accent ?? theme.bgDeep ?? "#5b6472";
  const to = theme.accent2 ?? theme.tint ?? theme.bg ?? "#2b3040";
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}

export function SideMenu({ adapter, currentId }: SideMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<BookSummary[] | null>(null);

  useEffect(() => {
    let alive = true;
    adapter
      .listBooks()
      .then((bs) => {
        if (alive) setBooks(bs);
      })
      .catch((err) => {
        if (err instanceof StorageUnavailableError) return; // segue carregando
        if (alive) setBooks([]);
      });
    return () => {
      alive = false;
    };
  }, [adapter]);

  const others = (books ?? []).filter((b) => b.id !== currentId);

  return (
    <nav className="app-sidemenu" aria-label="Trocar de volume">
      <button
        type="button"
        className="app-sidemenu__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        Trocar de volume
      </button>

      {open ? (
        <div className="app-sidemenu__panel">
          {books == null ? (
            <p className="app-sidemenu__loading">Carregando volumes…</p>
          ) : others.length === 0 ? (
            <p className="app-sidemenu__only">Este é o seu único volume.</p>
          ) : (
            <ul className="app-sidemenu__stack">
              {books.map((b) => {
                const isCurrent = b.id === currentId;
                return (
                  <li key={b.id} className="app-sidemenu__item">
                    <button
                      type="button"
                      className={`app-sidemenu__spine ${isCurrent ? "is-current" : ""}`}
                      aria-current={isCurrent ? "true" : undefined}
                      disabled={isCurrent}
                      onClick={() => navigate(`/b/${b.id}`)}
                    >
                      <span
                        className="app-sidemenu__cover"
                        aria-hidden="true"
                        style={coverStyle(b.surface)}
                      />
                      <span className="app-sidemenu__spine-title">{b.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </nav>
  );
}
