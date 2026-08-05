import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { PAGE_W } from "./constants";
import { useStageScale } from "./useStageScale";

/**
 * Modo retrato (AD-005/AD-029) — arquivo NOVO, fora da lista vigiada do motor.
 *
 * No celular em pe o livro mantem a virada 3D, mas enquadra UMA pagina por vez.
 * Este hook e o orquestrador aditivo do reenquadramento; ele NAO toca `angles`,
 * `faces`, `surfaceOf`, `surfaceCache`, `inWindow`, `toc` nem a geometria do CSS.
 * Faz exatamente as tres coisas que o AD-029 autoriza:
 *
 *  1. poe `useStageScale` em modo pagina unica (`{ portrait }`);
 *  2. calcula um termo de enquadramento (`frameOffset`) para somar ao `stageX`,
 *     centralizando a metade esquerda ou direita do spread;
 *  3. instala swipe no viewport: dentro do spread alterna o lado; no limite,
 *     chama o `goTo` que ja existe (vira a folha) e reposiciona o lado.
 *
 * Gatilho: `matchMedia("(max-aspect-ratio: 3/4)")` — separa celular em pe de
 * tablet/desktop. Desligar volta ao desktop sem recarregar.
 */
export const PORTRAIT_QUERY = "(max-aspect-ratio: 3/4)";

/** Fracao minima de deslocamento horizontal (px) para contar como swipe. */
const SWIPE_THRESHOLD = 40;

export type FrameSide = "left" | "right";

export interface UsePortraitFrameArgs {
  /** Viewport onde o swipe e escutado (o mesmo ref medido pela escala). */
  viewportRef: RefObject<HTMLElement>;
  /** Navegacao imperativa ja existente do motor (vira a folha). */
  goTo: (leaf: number) => void;
  /** Le a folha atual do motor. */
  getLeaf: () => number;
}

export interface PortraitFrame {
  /** Escala do palco (pagina unica em retrato, spread no desktop). */
  scale: number;
  /** Retrato ligado pelo matchMedia. */
  portrait: boolean;
  /** Metade do spread enquadrada no momento. */
  frameSide: FrameSide;
  /** Termo em px de tela a SOMAR ao stageX; 0 fora do retrato. */
  frameOffset: number;
  /** Aplica um swipe: +1 avanca (esquerda->direita->proxima folha), -1 volta. */
  onSwipe: (dir: 1 | -1) => void;
}

function matchPortrait(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(PORTRAIT_QUERY).matches
  );
}

export function usePortraitFrame({
  viewportRef,
  goTo,
  getLeaf,
}: UsePortraitFrameArgs): PortraitFrame {
  const [portrait, setPortrait] = useState(matchPortrait);
  const [frameSide, setFrameSide] = useState<FrameSide>("left");

  // Ref espelho do lado, para o handler de swipe ler o valor atual sem recriar o
  // listener a cada alternancia (e sem chamar goTo dentro de um setState updater).
  const frameSideRef = useRef(frameSide);
  frameSideRef.current = frameSide;

  // Escala em modo pagina unica quando em retrato (AD-029 item 1).
  const scale = useStageScale(viewportRef, { portrait });

  // Gatilho reativo: off->on->off sem recarregar (MEDIA-10 AC5). Ao ligar o
  // retrato, recomeca no inicio do spread (pagina esquerda).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const sync = () => {
      setPortrait(mq.matches);
      if (mq.matches) setFrameSide("left");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Fluxo de leitura (AD-029 item 3): dentro do spread o swipe alterna o lado; no
  // limite chama o goTo existente (vira a folha) e reposiciona o enquadramento.
  const onSwipe = useCallback(
    (dir: 1 | -1) => {
      const side = frameSideRef.current;
      if (dir === 1) {
        // avancar: esquerda -> direita -> primeira pagina da proxima folha
        if (side === "left") setFrameSide("right");
        else {
          setFrameSide("left");
          goTo(getLeaf() + 1);
        }
      } else {
        // voltar: direita -> esquerda -> ultima pagina da folha anterior
        if (side === "right") setFrameSide("left");
        else {
          setFrameSide("right");
          goTo(getLeaf() - 1);
        }
      }
    },
    [goTo, getLeaf],
  );

  // Instala o swipe no viewport (AD-029 item 3). So enquanto em retrato.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !portrait) return;
    let startX: number | null = null;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? null;
    };
    const onEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX;
      const dx = endX - startX;
      startX = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      // arrastar para a esquerda (dx<0) avanca; para a direita volta.
      onSwipe(dx < 0 ? 1 : -1);
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [viewportRef, portrait, onSwipe]);

  // Termo de enquadramento (AD-029 item 2): desloca o palco meia pagina para
  // centralizar a metade enquadrada. Fora do retrato e 0 — desktop inalterado.
  const frameOffset = portrait
    ? (frameSide === "left" ? 1 : -1) * (PAGE_W / 2) * scale
    : 0;

  return { scale, portrait, frameSide, frameOffset, onSwipe };
}
