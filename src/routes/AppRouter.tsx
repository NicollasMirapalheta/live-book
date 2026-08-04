import { Route, Routes } from "react-router-dom";
import { NotFoundRoute } from "./NotFoundRoute";

/**
 * Tabela de rotas do produto (LIB-01, `AD-020`). Renderiza só `<Routes>`; o
 * `<BrowserRouter>` é montado por `main.tsx` (wiring — T15), e os testes envolvem
 * este componente num `MemoryRouter`.
 *
 * As rotas de leitor/estante/criação/compartilhamento entram como placeholders e
 * são substituídas pelos componentes reais nas tasks seguintes (T4, T7, T8, T9).
 */

/** Placeholder temporário — substituído pelo componente real da task correspondente. */
function Placeholder({ name }: { name: string }) {
  return <div data-testid={`route-${name}`}>{name}</div>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="shelf" />} />
      <Route path="/new" element={<Placeholder name="new" />} />
      <Route path="/b/:id" element={<Placeholder name="reader" />} />
      <Route path="/b/:id/p/:page" element={<Placeholder name="reader" />} />
      <Route path="/b/:id/c/:slug" element={<Placeholder name="reader" />} />
      <Route path="/s/:token" element={<Placeholder name="share" />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
