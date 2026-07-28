import type { ReactNode } from "react";

/** Tom visual da folha. Puramente estetico. */
export type PageTone = "paper" | "cover" | "accent" | "chapter";

export interface PageProps {
  children?: ReactNode;
  /**
   * Marca esta pagina como abertura de capitulo. O rotulo vira um item do
   * sumario e uma fita na borda direita do livro.
   */
  chapter?: string;
  /** Titulo curto usado no sumario e no marcador de leitura. */
  title?: string;
  tone?: PageTone;
  /** Esconde a numeracao no rodape da pagina. */
  hideNumber?: boolean;
  className?: string;
}

export interface TocEntry {
  /** Indice da FACE (0-based) onde o capitulo comeca. Usado como chave e para
   * saber qual item esta ativo. */
  page: number;
  /** Numero impresso da pagina do miolo (1-based), para exibir no sumario. */
  number: number;
  /** Indice da folha que precisa estar virada para a pagina aparecer. */
  leaf: number;
  label: string;
  title?: string;
}
