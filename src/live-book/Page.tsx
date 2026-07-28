import type { PageProps } from "./types";

/**
 * Uma pagina do livro. E so um contentor: o conteudo dentro dela e HTML/React
 * normal e continua interativo (links, tabelas, botoes) porque nenhuma
 * biblioteca de flipbook toma conta desse DOM.
 */
export function Page({ children, className = "" }: PageProps) {
  return <div className={`lb-page__body ${className}`}>{children}</div>;
}

Page.displayName = "LiveBook.Page";
