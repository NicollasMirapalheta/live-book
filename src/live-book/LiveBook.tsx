import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { animate, motion, motionValue, useMotionValue, useTransform } from "motion/react";
import { Leaf } from "./Leaf";
import { Page } from "./Page";
import { useStageScale } from "./useStageScale";
import { usePageSound } from "./usePageSound";
import type { PageProps, TocEntry } from "./types";
import {
  BOARD_SQUARE,
  DRAG_THRESHOLD,
  EASE,
  FLIP_S,
  PAGE_H,
  PAGE_W,
  SNAP_S,
  STAGE_W,
  STAGGER_S,
  WHEEL_THROTTLE_MS,
} from "./constants";
import type { CSSProperties } from "react";
import "./live-book.css";

export interface LiveBookProps {
  /** Paginas do miolo — uma sequencia de <LiveBook.Page>. Qualquer conteudo
   * React vale. O miolo e SO o miolo: a casca (capa/contracapa) vem a parte. */
  children: ReactNode;
  /** Arte da capa (frente). O lado de dentro fica em branco (folha de guarda). */
  cover?: ReactNode;
  /** Arte da contracapa (verso). O lado de dentro fica em branco. */
  backCover?: ReactNode;
  title?: string;
  subtitle?: string;
  /** Folha inicial (0 = livro fechado, capa a direita). */
  initialLeaf?: number;
  /** Liga o ruido de papel sintetizado a cada virada. */
  sound?: boolean;
  className?: string;
  onLeafChange?: (leaf: number) => void;
}

/**
 * Uma face do livro. A casca (capa + contracapa) e uma coisa; o miolo (as
 * folhas de papel) e outra. Separar os dois deixa estilo e tamanho de cada um
 * independentes — a capa pode transbordar (hardcover), o miolo nao.
 */
type Face =
  | { kind: "cover"; node: ReactNode } // arte da capa (frente, externa)
  | { kind: "back-cover"; node: ReactNode } // arte da contracapa (verso, externa)
  | { kind: "endpaper" } // lado de dentro da capa/contracapa, em branco
  | { kind: "blank" } // folha de enchimento para o par de faces fechar
  | { kind: "page"; el: ReactElement<PageProps>; number: number }; // miolo

const isCoverArt = (f?: Face): f is { kind: "cover" | "back-cover"; node: ReactNode } =>
  f?.kind === "cover" || f?.kind === "back-cover";

interface DragState {
  index: number;
  dir: 1 | -1;
  startX: number;
  progress: number;
  moved: boolean;
}

export function LiveBook({
  children,
  cover,
  backCover,
  title = "Live Book",
  subtitle,
  initialLeaf = 0,
  sound = true,
  className = "",
  onLeafChange,
}: LiveBookProps) {
  const contentPages = useMemo(
    () => Children.toArray(children).filter(isValidElement) as ReactElement<PageProps>[],
    [children],
  );

  // Ordem de leitura das FACES: capa · guarda · miolo · guarda · contracapa.
  // O miolo comeca na 3ª face — "o livro em si" so aparece depois de abrir a
  // capa. Se o miolo tiver numero impar de paginas, entra uma folha em branco
  // para a contracapa cair sempre no verso da ultima folha (indice impar).
  const faces = useMemo<Face[]>(() => {
    const list: Face[] = [];
    list.push({ kind: "cover", node: cover }); // face 0 — capa (recto, fechada)
    list.push({ kind: "endpaper" }); // face 1 — dentro da capa (verso)
    contentPages.forEach((el, i) => list.push({ kind: "page", el, number: i + 1 }));
    if (list.length % 2 !== 0) list.push({ kind: "blank" });
    list.push({ kind: "endpaper" }); // dentro da contracapa (recto)
    list.push({ kind: "back-cover", node: backCover }); // contracapa (verso)
    return list;
  }, [contentPages, cover, backCover]);

  const leaves = faces.length / 2;

  const [leaf, setLeaf] = useState(() => clamp(initialLeaf, 0, leaves));
  const leafRef = useRef(leaf);
  const [muted, setMuted] = useState(!sound);
  const [tocOpen, setTocOpen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const scale = useStageScale(viewportRef);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const play = usePageSound(muted);

  // Um MotionValue de angulo por folha. Criados uma vez: uma nova virada
  // comeca de onde a anterior parou, sem salto.
  const angles = useMemo(
    () =>
      Array.from({ length: leaves }, (_, i) => motionValue(i < leafRef.current ? -180 : 0)),
    [leaves],
  );

  // Deslocamento do palco para centralizar a capa da frente / a contracapa.
  // Dirigido pelo angulo das folhas de capa: a re-centragem acontece enquanto a
  // capa gira e COMPLETA aos 90° (capa de pe), entao a segunda metade da virada
  // — a revelacao/ocultacao do spread — fica com o livro parado, igual a uma
  // folha. Sem isso o palco desliza junto e a capa "escorrega".
  const stageOffset = (a0: number, aLast: number, s: number) =>
    (-0.5 * clamp((90 - Math.abs(a0)) / 90, 0, 1) +
      0.5 * clamp((Math.abs(aLast) - 90) / 90, 0, 1)) *
    PAGE_W *
    s;
  const stageX = useMotionValue(
    stageOffset(angles[0].get(), angles[leaves - 1].get(), scale),
  );
  useEffect(() => {
    const a0 = angles[0];
    const aLast = angles[leaves - 1];
    const update = () => stageX.set(stageOffset(a0.get(), aLast.get(), scaleRef.current));
    update();
    const unsub0 = a0.on("change", update);
    const unsubLast = aLast.on("change", update);
    return () => {
      unsub0();
      unsubLast();
    };
    // scale entra nas deps para recalcular ao redimensionar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angles, leaves, scale, stageX]);

  // Opacidade das placas de capa dura (o .lb-well) atras das folhas, dirigida
  // pelo angulo da capa da frente (folha 0) e da contracapa (ultima folha). A
  // placa e um painel inteiro, entao ela so pode entrar quando a folha da capa
  // ja esta DEITADA — assim a folha cobre o miolo da placa e voce so ve a placa
  // como MOLDURA, nunca como um bloco solido exposto. Enquanto a capa esta de pe,
  // o lado dela fica com o fundo a mostra (a "mesa"), como um livro abrindo.
  //
  // A capa da FRENTE deita a 180° (vira toda para a esquerda) → coverReveal.
  // A CONTRACAPA deita a 0° (fica plana a direita, no fundo da pilha) → precisa
  // do ESPELHO: alta perto de 0°, sumindo cedo quando a contracapa levanta. Antes
  // usava `1 - coverReveal`, que ficava opaca enquanto a contracapa estava DE PE
  // (|a| < 150) e expunha a placa pelada durante toda a virada — o "bug" da
  // contracapa. Reusar a mesma curva medida a partir de 0° garante simetria.
  const coverReveal = (a: number) => clamp((Math.abs(a) - 150) / 28, 0, 1);
  const coverSettle = (a: number) => coverReveal(180 - Math.abs(a));
  const leftWellOpacity = useTransform(angles[0], coverReveal);
  const rightWellOpacity = useTransform(angles[leaves - 1], coverSettle);
  const spineOpacity = useTransform(
    [angles[0], angles[leaves - 1]],
    ([a0, aLast]: number[]) => coverReveal(a0) * coverSettle(aLast),
  );

  const toc = useMemo<TocEntry[]>(() => {
    const entries: TocEntry[] = [];
    faces.forEach((face, f) => {
      if (face.kind !== "page") return;
      const label = face.el.props.chapter;
      if (!label) return;
      // O spread visivel em leaf = n mostra o verso da folha n-1 a esquerda e a
      // frente da folha n a direita. Sem o ceil, todo capitulo cai um spread
      // adiante — foi exatamente o bug da v1.
      entries.push({
        page: f,
        number: face.number,
        leaf: Math.ceil(f / 2),
        label,
        title: face.el.props.title,
      });
    });
    return entries;
  }, [faces]);

  const goTo = useCallback(
    (next: number, duration = FLIP_S) => {
      const from = leafRef.current;
      const target = clamp(next, 0, leaves);
      if (target === from) return;

      const forward = target > from;
      const moving: number[] = [];
      if (forward) for (let i = from; i < target; i += 1) moving.push(i);
      else for (let i = from - 1; i >= target; i -= 1) moving.push(i);

      moving.forEach((index, order) => {
        animate(angles[index], forward ? -180 : 0, {
          duration,
          ease: EASE,
          delay: order * STAGGER_S,
        });
        if (order < 4) play(order * STAGGER_S * 1000);
      });

      leafRef.current = target;
      setLeaf(target);
      onLeafChange?.(target);
    },
    [angles, leaves, play, onLeafChange],
  );

  /* ---------------------------------------------------------------- teclado */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(leafRef.current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(leafRef.current - 1);
      } else if (e.key === "Home") {
        goTo(0);
      } else if (e.key === "End") {
        goTo(leaves);
      } else if (e.key === "Escape") {
        setTocOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, leaves]);

  /* ----------------------------------------------------------------- scroll */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (now - last < WHEEL_THROTTLE_MS) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 8) return;
      last = now;
      goTo(leafRef.current + (delta > 0 ? 1 : -1));
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goTo]);

  /* ---------------------------------------------------------------- arraste */
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const onGrab = useCallback(
    (e: ReactPointerEvent, dir: 1 | -1) => {
      const index = dir === 1 ? leafRef.current : leafRef.current - 1;
      if (index < 0 || index >= leaves) return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      drag.current = { index, dir, startX: e.clientX, progress: 0, moved: false };
      setDragging(true);
    },
    [leaves],
  );

  const onMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = drag.current;
      if (!d) return;
      // Dividir pela largura da pagina *e* pela escala do palco. Sem a escala,
      // o arraste descola do cursor em telas pequenas.
      const span = PAGE_W * scaleRef.current;
      const raw = d.dir === 1 ? (d.startX - e.clientX) / span : (e.clientX - d.startX) / span;
      d.progress = clamp(raw, 0, 1);
      if (d.progress > 0.015) d.moved = true;
      angles[d.index].set(d.dir === 1 ? -180 * d.progress : -180 * (1 - d.progress));
    },
    [angles],
  );

  const onRelease = useCallback(
    (e: ReactPointerEvent) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      setDragging(false);
      (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);

      if (!d.moved) {
        goTo(leafRef.current + d.dir);
        return;
      }
      if (d.progress > DRAG_THRESHOLD) {
        goTo(leafRef.current + d.dir, SNAP_S);
      } else {
        animate(angles[d.index], d.dir === 1 ? 0 : -180, { duration: SNAP_S, ease: EASE });
      }
    },
    [angles, goTo],
  );

  /* ------------------------------------------------------------- renderizar */
  const surface = (faceIndex: number, side: "left" | "right") => {
    const face = faces[faceIndex];
    const cls = (extra: string) => `lb-page lb-page--${side} ${extra}`;

    // guardas (lado de dentro da casca) e enchimento: papel liso, sem numero.
    // A guarda vira moldura da placa; o enchimento e so papel rente.
    if (!face || face.kind === "endpaper" || face.kind === "blank") {
      const variant = face?.kind === "endpaper" ? "lb-page--endpaper" : "lb-page--blank";
      return (
        <div className={cls(variant)}>
          <div className="lb-page__sheet">
            <div className="lb-page__body" />
          </div>
          <span className="lb-page__gutter" />
        </div>
      );
    }

    // capa / contracapa: a casca. Recebe a arte que veio pelas props.
    if (isCoverArt(face)) {
      return (
        <div className={cls("lb-page--cover")}>
          <div className="lb-page__sheet">{face.node ?? <div className="lb-page__body" />}</div>
          <span className="lb-page__gutter" />
        </div>
      );
    }

    // pagina do miolo.
    const props = face.el.props;
    const tone = props.tone ?? "paper";
    return (
      <div className={cls(`lb-page--${tone}`)}>
        <div className="lb-page__sheet">{face.el}</div>
        {!props.hideNumber ? <span className="lb-page__num">{face.number}</span> : null}
        <span className="lb-page__gutter" />
      </div>
    );
  };

  const leftFace = leaf > 0 ? 2 * leaf - 1 : -1;
  const rightFace = leaf < leaves ? 2 * leaf : -1;
  const progress = leaves === 0 ? 0 : leaf / leaves;
  const current = toc.filter((t) => t.leaf <= leaf).slice(-1)[0];

  // Rotulo do spread visivel: "6–7", ou so um numero quando o livro mostra uma
  // pagina do miolo sozinha. Capa, contracapa e guardas nao tem numero.
  const shownNumbers = [leftFace, rightFace]
    .map((f) => faces[f])
    .filter((face): face is Extract<Face, { kind: "page" }> => face?.kind === "page")
    .map((face) => face.number);
  const pageLabel =
    shownNumbers.length === 2
      ? `${shownNumbers[0]}–${shownNumbers[1]}`
      : `${shownNumbers[0] ?? "—"}`;

  const sectionLabel =
    leaf === 0
      ? "Capa"
      : leaf >= leaves
        ? "Contracapa"
        : current
          ? current.label
          : "Miolo";
  const readNumber = shownNumbers.length ? shownNumbers[shownNumbers.length - 1] : 0;

  return (
    <div
      className={`lb-root ${className} ${dragging ? "is-dragging" : ""}`}
      data-open={leaf > 0}
      // A sobra da capa dura vem do mesmo numero que a escala usa (BOARD_SQUARE),
      // para placa e miolo nunca saírem de sincronia.
      style={{ "--lb-cover-square": `${BOARD_SQUARE}px` } as CSSProperties}
    >
      <header className="lb-header">
        <div className="lb-header__id">
          <span className="lb-mark" aria-hidden="true" />
          <div>
            <h1 className="lb-header__title">{title}</h1>
            {subtitle ? <p className="lb-header__subtitle">{subtitle}</p> : null}
          </div>
        </div>

        <div className="lb-progress" role="presentation">
          <div className="lb-progress__track">
            <div className="lb-progress__fill" style={{ width: `${progress * 100}%` }} />
            {toc.map((t) => (
              <span
                key={`mark-${t.page}`}
                className="lb-progress__tick"
                style={{ left: `${(t.leaf / leaves) * 100}%` }}
                title={t.label}
              />
            ))}
            <span className="lb-progress__head" style={{ left: `${progress * 100}%` }} />
          </div>
          <span className="lb-progress__label">
            {sectionLabel} · {readNumber}/{contentPages.length}
          </span>
        </div>

        <button
          type="button"
          className="lb-iconbtn"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={muted}
          title={muted ? "Ativar som de pagina" : "Silenciar som de pagina"}
        >
          {muted ? "Som off" : "Som on"}
        </button>
      </header>

      <div className="lb-body">
        {/* fita lateral: sumario escondido */}
        <div
          className={`lb-toc ${tocOpen ? "is-open" : ""}`}
          onMouseEnter={() => setTocOpen(true)}
          onMouseLeave={() => setTocOpen(false)}
        >
          <button
            type="button"
            className="lb-toc__ribbon"
            onClick={() => setTocOpen((o) => !o)}
            aria-expanded={tocOpen}
          >
            Sumário
          </button>
          <nav className="lb-toc__panel" aria-label="Sumário">
            <p className="lb-toc__eyebrow">Neste volume</p>
            <ul>
              <li>
                <button type="button" onClick={() => goTo(0)} className={leaf === 0 ? "is-current" : ""}>
                  <span className="lb-toc__num">00</span>
                  <span className="lb-toc__text">Capa</span>
                </button>
              </li>
              {toc.map((t, i) => (
                <li key={t.page}>
                  <button
                    type="button"
                    onClick={() => goTo(t.leaf)}
                    className={current?.page === t.page ? "is-current" : ""}
                  >
                    <span className="lb-toc__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="lb-toc__text">
                      <strong>{t.label}</strong>
                      {t.title ? <em>{t.title}</em> : null}
                    </span>
                    <span className="lb-toc__page">{t.number}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => goTo(leaves)}
                  className={leaf >= leaves ? "is-current" : ""}
                >
                  <span className="lb-toc__num">◊</span>
                  <span className="lb-toc__text">Contracapa</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="lb-viewport" ref={viewportRef}>
          <button
            type="button"
            className="lb-nav lb-nav--prev"
            onClick={() => goTo(leaf - 1)}
            disabled={leaf === 0}
            aria-label="Página anterior"
          >
            <Chevron dir="left" />
          </button>

          {/* O wrapper carrega a perspectiva e as alcas de arraste. Elas nao
              podem morar dentro do palco: num contexto preserve-3d a ordem de
              pintura vem da profundidade, nao do z-index, e as folhas passariam
              por cima delas. */}
          <motion.div
            className="lb-stagewrap"
            style={{
              width: STAGE_W * scale,
              height: PAGE_H * scale,
              perspective: `${3200 * scale}px`,
              // x dirigido pelo angulo da capa (ver stageX/stageOffset): a
              // re-centragem segue a rotacao e completa aos 90°, entao a
              // revelacao do spread fica parada — igual a virada de uma folha.
              x: stageX,
            }}
          >
            <div
              className="lb-stage"
              style={{ width: STAGE_W, height: PAGE_H, transform: `scale(${scale})` }}
            >
              <div className="lb-well" aria-hidden="true">
                <motion.span
                  className="lb-well__half lb-well__half--left"
                  style={{ opacity: leftWellOpacity }}
                />
                <motion.span
                  className="lb-well__half lb-well__half--right"
                  style={{ opacity: rightWellOpacity }}
                />
                <motion.span className="lb-well__spine" style={{ opacity: spineOpacity }} />
              </div>

              {angles.map((angle, i) => {
                // A capa e a contracapa sao placas rigidas: a folha INTEIRA e a
                // alca, e ela nao enrola no canto (sem o triangulo claro de
                // papel). O miolo e papel: enrola no canto. Detectar pela FOLHA
                // (0 e a ultima) cobre as DUAS faces da casca — inclusive o lado
                // de dentro, que agora e placa solida.
                const coverLeaf = i === 0 || i === leaves - 1;
                return (
                  <Leaf
                    key={i}
                    index={i}
                    leaves={leaves}
                    angle={angle}
                    front={surface(2 * i, "right")}
                    back={surface(2 * i + 1, "left")}
                    curlNext={i === leaf && !coverLeaf}
                    curlPrev={i === leaf - 1 && !coverLeaf}
                    coverNext={i === leaf && coverLeaf}
                    coverPrev={i === leaf - 1 && coverLeaf}
                    onGrab={onGrab}
                    onMove={onMove}
                    onRelease={onRelease}
                  />
                );
              })}
            </div>

            {/* faixas de arraste na borda externa: puxar aqui nunca briga com
                um link ou botao dentro da pagina */}
            <div
              className="lb-grip lb-grip--prev"
              onPointerDown={(e) => onGrab(e, -1)}
              onPointerMove={onMove}
              onPointerUp={onRelease}
              onPointerCancel={onRelease}
              aria-hidden="true"
            />
            <div
              className="lb-grip lb-grip--next"
              onPointerDown={(e) => onGrab(e, 1)}
              onPointerMove={onMove}
              onPointerUp={onRelease}
              onPointerCancel={onRelease}
              aria-hidden="true"
            />
          </motion.div>

          <button
            type="button"
            className="lb-nav lb-nav--next"
            onClick={() => goTo(leaf + 1)}
            disabled={leaf === leaves}
            aria-label="Próxima página"
          >
            <Chevron dir="right" />
          </button>
        </div>

        {/* fitas de capitulo na borda direita */}
        <div className="lb-tabs" aria-hidden="true">
          {toc.map((t, i) => (
            <button
              type="button"
              key={t.page}
              className={`lb-tabs__tab ${current?.page === t.page ? "is-current" : ""}`}
              style={{ top: `${8 + i * 132}px` }}
              onClick={() => goTo(t.leaf)}
              title={t.title ?? t.label}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <footer className="lb-footer">
        <span className="lb-footer__hint">
          setas · teclado · scroll · arrastar a folha · canto da página
        </span>
        <span className="lb-footer__pages" aria-live="polite">
          <span className="lb-footer__pages-label">Página</span>
          <span className="lb-footer__pages-cur">{pageLabel}</span>
          <span className="lb-footer__pages-total">de {contentPages.length}</span>
        </span>
      </footer>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 5 L8 12 L15 19" : "M9 5 L16 12 L9 19"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

LiveBook.Page = Page;
