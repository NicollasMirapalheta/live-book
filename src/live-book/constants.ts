/** Geometria do palco. Uma folha = duas paginas (frente e verso). */
export const PAGE_W = 560;
export const PAGE_H = 760;
export const STAGE_W = PAGE_W * 2;

/** Tempos de animacao, em segundos (Motion trabalha em segundos). */
export const FLIP_S = 0.88;
export const STAGGER_S = 0.13;
export const SNAP_S = 0.52;

/** Easing cubico in-out, equivalente ao usado na v1. */
export const EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Fracao minima do arraste para a folha virar em vez de voltar. */
export const DRAG_THRESHOLD = 0.28;

/** Intervalo minimo entre viradas disparadas pelo scroll. */
export const WHEEL_THROTTLE_MS = 750;

/** Altura maxima que a folha levanta do plano do livro, no meio do arco. */
export const LIFT_Z = 34;

/**
 * "Square" da capa dura: quanto a placa da capa transborda o miolo (px no palco,
 * na escala 1). E o que da a sensacao de livro de capa dura — a placa e maior
 * que as folhas e as emoldura, fechado e aberto. A escala reserva espaco para
 * essa sobra e o CSS recebe o mesmo valor por variavel (--lb-cover-square), para
 * placa e miolo nunca saírem de sincronia. */
export const BOARD_SQUARE = 26;
