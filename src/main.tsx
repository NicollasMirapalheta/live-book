import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { pickAdapter } from "./data";
import { AdapterProvider } from "./routes/AdapterContext";
import { AppRouter } from "./routes/AppRouter";
import { seedDemoIfEmpty } from "./data/seed";
import "./book/surfaces/manuscript"; // registra a surface manuscript (side-effect)
import "./book/surfaces/album"; // registra a surface album (side-effect — MEDIA-06 AC5)
import "./live-book/prose.css"; // tipografia lb-* usada pelo HTML dos blocos text
import "./ui/ui.css"; // camada visual do produto (estante + side menu, AD-015)
import "./index.css";

/**
 * Wiring do app (LIB-01..06). O `pickAdapter()` escolhe a fonte por ambiente
 * (Supabase com env, senão LocalAdapter); em dev offline, semeia o demoDoc para a
 * estante ter conteúdo. O `<BrowserRouter>` mora aqui; os testes usam MemoryRouter.
 */
async function bootstrap() {
  const adapter = pickAdapter();
  await seedDemoIfEmpty(adapter);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <AdapterProvider adapter={adapter}>
          <AppRouter />
        </AdapterProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap();
