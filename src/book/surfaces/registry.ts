/**
 * Registry de surfaces (DOC-07, ADR-006).
 *
 * Registrar uma surface nova nao exige tocar no renderer nem no motor. A tabela de
 * blocos de uma surface e `nucleo ∪ surface.blocks`, memoizada por surfaceId — em
 * 300 paginas, recomputar a cada pagina seria desperdicio.
 *
 * Reexporta os tipos de surface (definidos em ../RenderCtx para evitar ciclo de
 * import), entao os consumidores continuam importando-os daqui, como o design previa.
 */

import { coreBlocks } from "../blocks";
import type { SurfaceId } from "../schema";
import type { BlockTable, SurfaceDef } from "../RenderCtx";

export type { BlockRenderProps, BlockTable, SurfaceDef, SurfaceLayout, SurfaceChrome } from "../RenderCtx";

const REGISTRY = new Map<string, SurfaceDef>();
const tableCache = new Map<string, BlockTable>();

/** Raio de janela padrao quando a surface nao existe. Espelha WINDOW_RADIUS do
 * motor (constants.ts); mantido literal para nao acoplar Composition ao motor. */
const FALLBACK_WINDOW_RADIUS = 4;

export function registerSurface(def: SurfaceDef): void {
  REGISTRY.set(def.id, def);
  // registrar (ou re-registrar) invalida a tabela memoizada desta surface
  tableCache.delete(def.id);
}

/** Fallback para surface nao registrada: blocos de nucleo, sem tema, sem lançar —
 * um volume nunca deve ficar inabrivel (DOC-07 AC2). */
function fallbackSurface(id: SurfaceId): SurfaceDef {
  return {
    id,
    label: String(id),
    layouts: [],
    theme: {},
    defaultWindowRadius: FALLBACK_WINDOW_RADIUS,
  };
}

export function getSurface(id: SurfaceId): SurfaceDef {
  return REGISTRY.get(id) ?? fallbackSurface(id);
}

export function listSurfaces(): SurfaceDef[] {
  return [...REGISTRY.values()];
}

/** Tabela de dispatch de blocos da surface: nucleo somado aos blocos exclusivos.
 * Memoizada por surfaceId — chamadas repetidas devolvem a MESMA referencia, para o
 * PageBody nao reconstruir a tabela a cada render. */
export function blockTableFor(id: SurfaceId): BlockTable {
  const cached = tableCache.get(id);
  if (cached) return cached;

  const surface = getSurface(id);
  const table: BlockTable = { ...coreBlocks, ...(surface.blocks ?? {}) };
  tableCache.set(id, table);
  return table;
}
