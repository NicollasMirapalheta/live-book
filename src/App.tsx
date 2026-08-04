import type { CSSProperties } from "react";
import { LiveBook } from "./live-book";
import { renderCover, renderPages } from "./book/renderPages";
import { getSurface } from "./book/surfaces/registry";
import { themeToVars } from "./book/schema";
import type { RenderCtx } from "./book/RenderCtx";
import { demoDoc } from "./demo/demoDoc";
import "./book/surfaces/manuscript"; // registra a surface manuscript
import "./live-book/prose.css"; // tipografia lb-* usada pelo HTML dos blocos text

/**
 * O livro agora e gerado de um BookDoc (Fase 1). O motor nao sabe que documentos
 * existem: recebe paginas de renderPages e o tema traduzido em custom properties.
 */
export default function App() {
  const surface = getSurface(demoDoc.surface);
  const ctx: RenderCtx = {
    doc: demoDoc,
    surface,
    mode: "read",
    // Fase 1: identidade sobre caminho estatico. A Fase 2 troca pela do adapter.
    assetUrl: (ref) => ref.id,
  };

  // Tema da surface, com o do documento por cima quando houver.
  const style = {
    ...themeToVars(surface.theme),
    ...themeToVars(demoDoc.theme),
  } as CSSProperties;

  return (
    <LiveBook
      title={demoDoc.title}
      subtitle={demoDoc.subtitle}
      sound
      windowRadius={surface.defaultWindowRadius}
      style={style}
      cover={renderCover(demoDoc.cover, ctx)}
      backCover={renderCover(demoDoc.backCover, ctx)}
    >
      {renderPages(demoDoc, ctx)}
    </LiveBook>
  );
}
