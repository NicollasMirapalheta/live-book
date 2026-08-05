import { useEffect, useState, type RefObject } from "react";
import { BOARD_SQUARE, PAGE_H, PAGE_W, STAGE_W } from "./constants";

// O livro aberto ocupa o palco MAIS a sobra da capa dura em toda a volta.
// Ajustar a caixa de referencia aqui evita a placa ser cortada no topo/base.
const BOOK_W = STAGE_W + 2 * BOARD_SQUARE;
const BOOK_H = PAGE_H + 2 * BOARD_SQUARE;

// Retrato (AD-005/AD-029): no celular em pe o palco escala pela largura de UMA
// pagina (mais a sobra da capa), nao do spread inteiro. E o que deixa a pagina
// exibida legivel (>=320px em 390x844) mantendo a virada 3D — o motor continua
// montando o spread; so o enquadramento muda.
const PAGE_ONE_W = PAGE_W + 2 * BOARD_SQUARE;

export interface StageScaleOptions {
  /** Folga em torno do palco, subtraida da viewport antes de caber. */
  margin?: number;
  /** Modo retrato: escala por uma pagina em vez do spread (AD-029). */
  portrait?: boolean;
}

/**
 * Escala do palco para caber na viewport.
 *
 * A estimativa inicial vem de window.innerWidth/Height ja no useState — se
 * esperarmos a primeira medicao do ref, o livro abre grande e "conserta"
 * sozinho no primeiro frame util. (Armadilha 3 da v1.)
 *
 * `options.portrait` (aditivo, AD-029) escala por uma pagina; sem ele o
 * resultado e identico ao anterior.
 */
export function useStageScale(ref: RefObject<HTMLElement>, options: StageScaleOptions = {}) {
  const { portrait = false } = options;
  // Sem os chevrons laterais, o retrato usa quase toda a largura da viewport; a
  // margem padrao (104) espremeria a pagina abaixo de 320px em 390px.
  const margin = options.margin ?? (portrait ? 16 : 104);
  const boxW = portrait ? PAGE_ONE_W : BOOK_W;

  const [scale, setScale] = useState(() => estimate(margin, boxW, portrait));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      // setScale com o MESMO numero e no-op no React — so re-renderiza quando a
      // escala realmente muda.
      setScale(fit(width - margin, height - margin, boxW));
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
  }, [ref, margin, boxW]);

  return scale;
}

function fit(width: number, height: number, boxW: number) {
  return Math.max(0.25, Math.min(1, width / boxW, height / BOOK_H));
}

function estimate(margin: number, boxW: number, portrait: boolean) {
  if (typeof window === "undefined") return 1;
  // No desktop a estimativa desconta o chrome lateral/vertical (chevrons, header,
  // rodape). O retrato ja usa margem minima e nao tem chevrons laterais.
  const padX = portrait ? 0 : 120;
  const padY = portrait ? 0 : 150;
  return fit(window.innerWidth - margin - padX, window.innerHeight - margin - padY, boxW);
}
