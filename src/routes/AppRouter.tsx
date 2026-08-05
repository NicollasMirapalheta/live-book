import { Route, Routes } from "react-router-dom";
import { ImportRoute } from "./ImportRoute";
import { NotFoundRoute } from "./NotFoundRoute";
import { NewBookRoute } from "./NewBookRoute";
import { ReaderRoute } from "./ReaderRoute";
import { ShareRoute } from "./ShareRoute";
import { ShelfRoute } from "./ShelfRoute";

/**
 * Tabela de rotas do produto (LIB-01, `AD-020`). Renderiza só `<Routes>`; o
 * `<BrowserRouter>` é montado por `main.tsx` (wiring — T15), e os testes envolvem
 * este componente num `MemoryRouter`.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<ShelfRoute />} />
      <Route path="/new" element={<NewBookRoute />} />
      <Route path="/b/:id" element={<ReaderRoute />} />
      <Route path="/b/:id/import" element={<ImportRoute />} />
      <Route path="/b/:id/p/:page" element={<ReaderRoute />} />
      <Route path="/b/:id/c/:slug" element={<ReaderRoute />} />
      <Route path="/s/:token" element={<ShareRoute />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
