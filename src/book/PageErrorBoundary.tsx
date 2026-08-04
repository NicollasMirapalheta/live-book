import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Error boundary que isola uma falha de render (DOC-06).
 *
 * Um try/catch em volta do dispatch NAO funciona: `<C block={b} />` so cria um
 * elemento; a excecao acontece quando o React renderiza o filho, fora do try. So
 * error boundary contem isso.
 *
 * Usado POR BLOCO pelo PageBody (nao por pagina): assim um bloco corrompido some
 * sozinho e os irmaos continuam no DOM (T9), enquanto o volume inteiro segue
 * navegavel. Ao capturar, registra `type` e `id` do bloco (via `label`) — e a
 * unica pista de qual bloco quebrou.
 */
export interface PageErrorBoundaryProps {
  children: ReactNode;
  /** Identificacao do que esta protegido, para o log (ex.: "bloco image#b1"). */
  label?: string;
  /** O que renderizar no lugar quando o filho lanca. Padrao: nada (o bloco some). */
  fallback?: ReactNode;
}

interface State {
  failed: boolean;
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nunca propaga: registra e segue. O `label` carrega type+id do bloco.
    console.error(
      `[live-book] falha ao renderizar ${this.props.label ?? "conteudo"}:`,
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
