import { useEffect, useState, type RefObject } from "react";
import { BOARD_SQUARE, PAGE_H, STAGE_W } from "./constants";

// O livro aberto ocupa o palco MAIS a sobra da capa dura em toda a volta.
// Ajustar a caixa de referencia aqui evita a placa ser cortada no topo/base.
const BOOK_W = STAGE_W + 2 * BOARD_SQUARE;
const BOOK_H = PAGE_H + 2 * BOARD_SQUARE;

/**
 * Escala do palco para caber na viewport.
 *
 * A estimativa inicial vem de window.innerWidth/Height ja no useState — se
 * esperarmos a primeira medicao do ref, o livro abre grande e "conserta"
 * sozinho no primeiro frame util. (Armadilha 3 da v1.)
 */
export function useStageScale(ref: RefObject<HTMLElement>, margin = 104) {
  const [scale, setScale] = useState(() => estimate(margin));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // setScale com o MESMO numero e no-op no React — so re-renderiza quando a
      // escala realmente muda.
      setScale(fit(width - margin, height - margin));
    };

    // Coalesce as rajadas do ResizeObserver num unico measure por frame: arrastar
    // a borda da janela disparava dezenas de setScale/s, cada um re-renderizando
    // todas as folhas.
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };

    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ref, margin]);

  return scale;
}

function fit(width: number, height: number) {
  return Math.max(0.25, Math.min(1, width / BOOK_W, height / BOOK_H));
}

function estimate(margin: number) {
  if (typeof window === "undefined") return 1;
  return fit(window.innerWidth - margin - 120, window.innerHeight - margin - 150);
}
