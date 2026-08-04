/**
 * Schema do documento (BookDoc) — a representacao serializavel de um volume.
 *
 * Contexto Composition. Este arquivo NAO importa React nem nada de
 * `src/live-book/` (invariante do CLAUDE.md e done-when da T1): e dado puro,
 * serializavel para JSON, que vai para o banco e o editor manipula.
 *
 * ADR-006 (surface como unico eixo de variacao) e AD-006/AD-011 governam a forma.
 */

/** Versao corrente do schema. `migrateDoc` leva qualquer versao conhecida ate esta. */
export const SCHEMA_VERSION = 1;

/** Tom visual da folha. ESPELHA `PageTone` de `src/live-book/types.ts` — mantido
 * em sincronia de proposito, sem importar do motor (invariante de dependencia). */
export type PageTone = "paper" | "cover" | "accent" | "chapter";

/** Como o volume se apresenta — o unico eixo de variacao armazenado (ADR-006).
 * O `(string & {})` preserva o autocomplete dos conhecidos sem fechar o conjunto:
 * uma surface nova nao exige tocar neste tipo. */
export type SurfaceId = "manuscript" | "album" | "journal" | "scan" | (string & {});

// --- Assets -------------------------------------------------------------------

/** Tamanhos de variante de imagem. `page` = 1100px no maior lado (AD-014). */
export type AssetSize = "thumb" | "page" | "full";

/** Referencia a um asset no storage. Guarda so metadados; a URL vem de
 * `ctx.assetUrl(ref, size)` (sincrona — esta no caminho de render, AD-013). */
export interface AssetRef {
  /** id/path uuid no storage. Na Fase 1 e resolvido por identidade sobre caminho estatico. */
  id: string;
  /** largura intrinseca, para reservar a caixa e evitar deslocamento de layout. */
  w?: number;
  /** altura intrinseca. */
  h?: number;
  /** placeholder de baixa qualidade (data URI), aplicado como background enquanto carrega. */
  lqip?: string;
}

// --- Blocos -------------------------------------------------------------------

export interface BaseBlock {
  /** id estavel, usado como React key e alvo de edicao. */
  id: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  /** 1 a 3; ausente vira 2. */
  level?: 1 | 2 | 3;
  align?: "left" | "center" | "right";
}

export interface TextBlock extends BaseBlock {
  type: "text";
  /** HTML do proprio autor. Na Fase 1 e renderizado direto, sem sanitizacao
   * (AD-024); a sanitizacao vira obrigacao da Fase 2, quando o documento passa a
   * vir da rede. */
  html: string;
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  cite?: string;
}

export interface CalloutBlock extends BaseBlock {
  type: "callout";
  html: string;
  /** variacao estetica do aviso. */
  tone?: "info" | "warn" | "accent";
  /** simbolo curto exibido no marcador (ex.: "i", "!", "?"). */
  icon?: string;
}

export interface RuleBlock extends BaseBlock {
  type: "rule";
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  /** `fill` ocupa o espaco restante da pagina (empurra o conteudo seguinte para baixo). */
  size?: "sm" | "md" | "lg" | "fill";
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  asset: AssetRef;
  /** ausente = imagem decorativa (alt=""). */
  alt?: string;
  caption?: string;
  fit?: "cover" | "contain";
}

export interface GalleryItem {
  asset: AssetRef;
  alt?: string;
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  items: GalleryItem[];
  /** 2 ou 3 colunas; ausente vira 2. */
  columns?: 2 | 3;
}

/** Bloco cujo `type` nao e registrado neste cliente. NUNCA e descartado — os
 * campos arbitrarios sobrevivem ao round-trip, senao salvar numa versao antiga
 * apagaria conteudo do usuario (AD-002 da linguagem ubiqua, DOC-02). */
export interface UnknownBlock extends BaseBlock {
  type: string;
  [key: string]: unknown;
}

/** Os oito blocos de nucleo, disponiveis para toda surface sem registro. */
export type CoreBlock =
  | HeadingBlock
  | TextBlock
  | QuoteBlock
  | CalloutBlock
  | RuleBlock
  | SpacerBlock
  | ImageBlock
  | GalleryBlock;

/** Qualquer bloco de um documento: nucleo ou desconhecido. */
export type Block = CoreBlock | UnknownBlock;

// --- Pagina, capa e tema ------------------------------------------------------

export interface BookPage {
  id: string;
  blocks: Block[];
  /** promove a pagina a abertura de secao: alimenta sumario e fita. */
  chapter?: string;
  title?: string;
  tone?: PageTone;
  hideNumber?: boolean;
  /** id de um layout registrado pela surface; desconhecido cai no fluxo padrao. */
  layout?: string;
}

/** Capa e contracapa: mesma pipeline de blocos das paginas, para o editor de capa
 * ser o mesmo depois (AD-006 das assuncoes da spec). */
export interface CoverSpec {
  blocks: Block[];
  tone?: PageTone;
}

/** Tema do volume por chaves semanticas. Traduzido em custom properties `--lb-*`
 * por `themeToVars`. Chaves semanticas em vez dos nomes de variavel mantem o
 * documento desacoplado do CSS do motor. */
export interface BookTheme {
  bg?: string;
  bgDeep?: string;
  paper?: string;
  paper2?: string;
  ink?: string;
  inkSoft?: string;
  accent?: string;
  accent2?: string;
  tint?: string;
  cover?: string;
  radius?: string;
}

export interface BookDoc {
  schemaVersion: number;
  id: string;
  title: string;
  subtitle?: string;
  surface: SurfaceId;
  /** sobrescreve o tema da surface quando presente. */
  theme?: BookTheme;
  cover?: CoverSpec;
  backCover?: CoverSpec;
  pages: BookPage[];
}

/** Mapeia as chaves semanticas do tema para as custom properties `--lb-*` do
 * motor. Devolve um Record plano (sem tipo do React), para o consumidor espalhar
 * em `style`. Chaves ausentes no tema simplesmente nao entram. */
const THEME_VAR: Record<keyof BookTheme, `--lb-${string}`> = {
  bg: "--lb-bg",
  bgDeep: "--lb-bg-deep",
  paper: "--lb-paper",
  paper2: "--lb-paper-2",
  ink: "--lb-ink",
  inkSoft: "--lb-ink-soft",
  accent: "--lb-accent",
  accent2: "--lb-accent-2",
  tint: "--lb-tint",
  cover: "--lb-cover",
  radius: "--lb-radius",
};

export function themeToVars(theme: BookTheme | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!theme) return out;
  (Object.keys(theme) as Array<keyof BookTheme>).forEach((k) => {
    const value = theme[k];
    if (value != null) out[THEME_VAR[k]] = value;
  });
  return out;
}
