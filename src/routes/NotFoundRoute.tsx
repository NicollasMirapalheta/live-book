import { Link } from "react-router-dom";

/**
 * Rota `*` — volume/rota inexistente. Sempre oferece o caminho de volta à estante,
 * para o leitor nunca ficar preso numa URL sem saída (edge case da spec).
 */
export function NotFoundRoute() {
  return (
    <main className="app-notfound">
      <h1>Não encontrado</h1>
      <p>Esta página não existe ou o volume foi removido.</p>
      <Link to="/">Voltar à estante</Link>
    </main>
  );
}
