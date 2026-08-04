import { memo, useCallback, useState, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { LIFT_Z } from "./constants";

export interface LeafProps {
  index: number;
  leaves: number;
  angle: MotionValue<number>;
  front: ReactNode;
  back: ReactNode;
  /** Mostra o canto enrolando na frente (avancar). */
  curlNext: boolean;
  /** Mostra o canto enrolando no verso (voltar). */
  curlPrev: boolean;
  /** Face da frente e uma capa dura: toda a face vira alca de pegar (avancar). */
  coverNext?: boolean;
  /** Face do verso e uma capa dura: toda a face vira alca de pegar (voltar). */
  coverPrev?: boolean;
  /** Esta folha e a que esta sendo arrastada agora (o arraste move o angulo por
   * .set(), sem disparar evento de animacao — por isso precisa vir de fora). */
  active?: boolean;
  onGrab: (event: PointerEvent, dir: 1 | -1) => void;
  onMove: (event: PointerEvent) => void;
  onRelease: (event: PointerEvent) => void;
}

/**
 * Uma folha: frente e verso independentes girando em torno da lombada.
 *
 * Tudo que depende do angulo (levantar, sombra, qual face aparece) e derivado
 * do MotionValue no mesmo frame. Derivar do angulo *alvo* daria seno zero no
 * primeiro frame e a folha nunca levantaria nem sombrearia. (Armadilha 1.)
 */
export const Leaf = memo(function Leaf({
  index,
  leaves,
  angle,
  front,
  back,
  curlNext,
  curlPrev,
  coverNext,
  coverPrev,
  active,
  onGrab,
  onMove,
  onRelease,
}: LeafProps) {
  const arc = useTransform(angle, (a) => Math.sin((Math.abs(a) / 180) * Math.PI));
  const lift = useTransform(arc, (v) => v * LIFT_Z);
  const shade = useTransform(arc, (v) => v * 0.85);
  const frontVisibility = useTransform(angle, (a) => (Math.abs(a) > 90 ? "hidden" : "visible"));
  const backVisibility = useTransform(angle, (a) => (Math.abs(a) > 90 ? "visible" : "hidden"));

  // A ordem de empilhamento vira quando a folha cruza os 90 graus.
  const [turned, setTurned] = useState(() => Math.abs(angle.get()) > 90);
  useMotionValueEvent(angle, "change", (a) => {
    const next = Math.abs(a) > 90;
    if (next !== turned) setTurned(next);
  });

  // will-change so enquanto a folha realmente se move: liga no inicio da
  // animacao (animate()) e desliga ao completar; o arraste vem por `active`.
  const [animating, setAnimating] = useState(false);
  useMotionValueEvent(angle, "animationStart", () => setAnimating(true));
  useMotionValueEvent(angle, "animationComplete", () => setAnimating(false));
  useMotionValueEvent(angle, "animationCancel", () => setAnimating(false));
  const isLive = animating || !!active;

  // Folha fora do spread atual: montada (dentro da janela) mas ocluida atras do
  // spread, com a face visivel ainda no tab order. `inert` a tira da a11y e do
  // foco (LIB-07, AD-027). "E o spread?" ja esta nas props: curl*/cover* sao
  // true exatamente quando index === leaf (Next) ou index === leaf-1 (Prev). A
  // face virada de uma folha do spread ja sai sozinha por visibility:hidden.
  //
  // Aplicado pela propriedade DOM `inert` num ref callback: o tipo do motion.div
  // nao aceita o atributo `inert`, e o callback so re-roda quando offSpread muda
  // (mesma cadencia da virada), sem custo por frame.
  const offSpread = !(curlNext || curlPrev || coverNext || coverPrev);
  const applyInert = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      if (offSpread) node.setAttribute("inert", "");
      else node.removeAttribute("inert");
    },
    [offSpread],
  );

  return (
    <motion.div
      ref={applyInert}
      className={`lb-leaf${isLive ? " is-live" : ""}`}
      style={{ rotateY: angle, z: lift, zIndex: turned ? leaves + index + 1 : leaves - index }}
    >
      <motion.div className="lb-face lb-face--front" style={{ visibility: frontVisibility }}>
        {front}
        <motion.div className="lb-face__shade lb-face__shade--front" style={{ opacity: shade }} />
        {curlNext && (
          <Corner dir={1} onGrab={onGrab} onMove={onMove} onRelease={onRelease} />
        )}
        {coverNext && (
          <CoverGrab dir={1} onGrab={onGrab} onMove={onMove} onRelease={onRelease} />
        )}
      </motion.div>

      <motion.div className="lb-face lb-face--back" style={{ visibility: backVisibility }}>
        {back}
        <motion.div className="lb-face__shade lb-face__shade--back" style={{ opacity: shade }} />
        {curlPrev && (
          <Corner dir={-1} onGrab={onGrab} onMove={onMove} onRelease={onRelease} />
        )}
        {coverPrev && (
          <CoverGrab dir={-1} onGrab={onGrab} onMove={onMove} onRelease={onRelease} />
        )}
      </motion.div>
    </motion.div>
  );
});

/**
 * O canto nao e a folha inclinada: sao dois triangulos recortados por clip-path
 * que crescem do zero, mais um radial atras fazendo a sombra na pagina de baixo.
 * Barato e convincente; dobra com curvatura real exigiria WebGL.
 *
 * Ele tambem e a alca de arraste. Restringir o arraste ao canto e a faixa da
 * borda externa e o que mantem links e botoes dentro da pagina clicaveis.
 */
function Corner({
  dir,
  onGrab,
  onMove,
  onRelease,
}: {
  dir: 1 | -1;
  onGrab: (event: PointerEvent, dir: 1 | -1) => void;
  onMove: (event: PointerEvent) => void;
  onRelease: (event: PointerEvent) => void;
}) {
  const side = dir === 1 ? "next" : "prev";
  return (
    <div
      className={`lb-corner lb-corner--${side}`}
      role="button"
      tabIndex={-1}
      aria-hidden="true"
      onPointerDown={(e) => onGrab(e, dir)}
      onPointerMove={onMove}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
    >
      <span className="lb-curl__shadow" />
      <span className="lb-curl__paper" />
      <span className="lb-curl__crease" />
    </div>
  );
}

/**
 * Capa dura nao enrola no canto, entao ela nao tem a alca de canto. Em troca,
 * a face inteira e a alca: clicar abre, arrastar vira. E no hover aparece uma
 * maozinha fazendo o gesto de arraste, indicando que da pra pegar dali.
 */
function CoverGrab({
  dir,
  onGrab,
  onMove,
  onRelease,
}: {
  dir: 1 | -1;
  onGrab: (event: PointerEvent, dir: 1 | -1) => void;
  onMove: (event: PointerEvent) => void;
  onRelease: (event: PointerEvent) => void;
}) {
  const side = dir === 1 ? "next" : "prev";
  return (
    <div
      className={`lb-covergrab lb-covergrab--${side}`}
      role="button"
      tabIndex={-1}
      aria-hidden="true"
      onPointerDown={(e) => onGrab(e, dir)}
      onPointerMove={onMove}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
    >
      {/* 4 copias empilhadas: a da frente lidera o gesto, as 3 de tras sao
          ecos que desvanecem — o rastro que sinaliza o movimento pra esquerda */}
      <span className="lb-covergrab__hint" aria-hidden="true">
        <HandIcon />
        <HandIcon />
        <HandIcon />
        <HandIcon />
      </span>
    </div>
  );
}

/** Maozinha em gesto de arraste, usada como dica de hover na capa. */
function HandIcon() {
  return (
    <svg
      className="lb-covergrab__hand"
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M11 12V4.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M14 12.5V6a1.5 1.5 0 0 1 3 0v6.5" />
      <path d="M17 12a1.5 1.5 0 0 1 3 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-4.3-1.8l-3.4-3.5a1.5 1.5 0 0 1 2.1-2.1L8 14.5" />
    </svg>
  );
}
