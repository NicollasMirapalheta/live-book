/**
 * Fabricas de documento, pagina e bloco (DOC-01).
 *
 * Ids sempre por `crypto.randomUUID` — estaveis por instancia e unicos entre
 * chamadas, para servir de React key e alvo de edicao. Um documento recem-criado
 * passa em `migrateDoc` sem alteracao (nasce na versao corrente).
 */

import {
  SCHEMA_VERSION,
  type Block,
  type BookDoc,
  type BookPage,
  type CoreBlock,
  type SurfaceId,
} from "./schema";

export interface CreateDocOptions {
  title?: string;
  subtitle?: string;
  surface?: SurfaceId;
  pages?: BookPage[];
}

export function createEmptyDoc(opts: CreateDocOptions = {}): BookDoc {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    title: opts.title ?? "Novo volume",
    subtitle: opts.subtitle,
    surface: opts.surface ?? "manuscript",
    pages: opts.pages ?? [],
  };
}

export function createPage(opts: Partial<Omit<BookPage, "id">> = {}): BookPage {
  return {
    id: crypto.randomUUID(),
    blocks: opts.blocks ?? [],
    chapter: opts.chapter,
    title: opts.title,
    tone: opts.tone,
    hideNumber: opts.hideNumber,
    layout: opts.layout,
  };
}

/** Defaults minimos por tipo de bloco de nucleo. Garantem que o bloco criado ja e
 * valido (campos obrigatorios preenchidos) antes de o autor editar. */
const BLOCK_DEFAULTS: { [T in CoreBlock["type"]]: Omit<Extract<CoreBlock, { type: T }>, "id" | "type"> } = {
  heading: { text: "" },
  text: { html: "" },
  quote: { text: "" },
  callout: { html: "" },
  rule: {},
  spacer: {},
  image: { asset: { id: "" } },
  gallery: { items: [] },
};

export function createBlock<T extends CoreBlock["type"]>(
  type: T,
  props: Partial<Omit<Extract<CoreBlock, { type: T }>, "id" | "type">> = {},
): Extract<CoreBlock, { type: T }> {
  return {
    id: crypto.randomUUID(),
    type,
    ...BLOCK_DEFAULTS[type],
    ...props,
  } as unknown as Extract<CoreBlock, { type: T }>;
}

/** Reexporta o tipo Block por conveniencia de quem so importa a fabrica. */
export type { Block };
