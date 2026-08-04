/**
 * Contexto de render e tipos da fronteira documento -> paginas (DOC-06/DOC-07).
 *
 * Estes tipos vivem juntos de proposito: `RenderCtx` referencia `SurfaceDef`, que
 * referencia `BlockRenderProps`, que referencia `RenderCtx`. Mante-los num arquivo
 * so evita um ciclo de import entre modulos (que quebraria a compilacao em estados
 * intermediarios). O `registry.ts` reexporta `SurfaceDef` e `BlockRenderProps`,
 * entao os consumidores continuam podendo importa-los de la, como o design previa.
 */

import type { ComponentType } from "react";
import type { AssetRef, AssetSize, Block, BookDoc, BookTheme, SurfaceId } from "./schema";

/** O contexto passado a cada bloco no render. `ctx` explicito (nao React Context)
 * mantem `renderPages` testavel como funcao pura (decisao de design). */
export interface RenderCtx {
  doc: BookDoc;
  surface: SurfaceDef;
  mode: "read" | "edit";
  /** Resolve a URL de um asset. SINCRONA (AD-013): esta no caminho de render das
   * folhas; uma URL assinada assincrona quebraria o surfaceCache do motor.
   * Na Fase 1 e identidade sobre caminho estatico; a Fase 2 troca pela do adapter. */
  assetUrl(ref: AssetRef, size?: AssetSize): string;
}

/** O que todo renderer de bloco recebe. Uniforme para caber em
 * `Record<string, ComponentType<BlockRenderProps>>`; cada renderer estreita
 * `block` para o seu tipo (a tabela de dispatch garante a correspondencia). */
export interface BlockRenderProps {
  block: Block;
  ctx: RenderCtx;
}

/** Tabela de dispatch de blocos: `type` -> componente. */
export type BlockTable = Record<string, ComponentType<BlockRenderProps>>;

export interface SurfaceLayout {
  id: string;
  label: string;
  /** Blocos iniciais ao aplicar o layout numa pagina nova. */
  seed: () => Block[];
}

export interface SurfaceChrome {
  hideNumbers?: boolean;
  margin?: "normal" | "tight" | "none";
}

/** Definicao de uma surface — como o volume se apresenta (ADR-006). */
export interface SurfaceDef {
  id: SurfaceId;
  label: string;
  /** Blocos exclusivos desta surface, somados ao nucleo em `blockTableFor`. */
  blocks?: BlockTable;
  layouts: SurfaceLayout[];
  theme: BookTheme;
  defaultWindowRadius: number;
  chrome?: SurfaceChrome;
  /** Migracao especifica da surface, aplicada no carregamento. */
  migrate?(doc: BookDoc): BookDoc;
}
