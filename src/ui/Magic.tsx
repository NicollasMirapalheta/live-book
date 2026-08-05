/**
 * Livro-farol — o motivo de magia do produto (AD-031). Um livro que levita com
 * faíscas âmbar e um brilho quente. Decorativo (`aria-hidden`), procedural (CSS),
 * respeita `prefers-reduced-motion` (sem movimento, composição parada). Vive nos
 * momentos mágicos — home vazia, carregando, volume vazio — NUNCA durante a leitura.
 */

const SPARKS: Array<[number, number]> = [
  [20, 30], [42, 20], [60, 38], [76, 26], [30, 54], [66, 56], [50, 14], [82, 46],
];
const LEAVES: Array<[number, number]> = [
  [38, 34], [58, 28], [48, 52],
];

export function Magic({ variant = "hero" }: { variant?: "hero" | "quiet" }) {
  return (
    <div className={`app-magic app-magic--${variant}`} aria-hidden="true">
      <span className="app-magic__glow" />
      <div className="app-magic__book">
        <span className="app-magic__page app-magic__page--l" />
        <span className="app-magic__gutter" />
        <span className="app-magic__page app-magic__page--r" />
      </div>
      {LEAVES.map(([left, top], i) => (
        <span
          key={`leaf-${i}`}
          className="app-magic__leaf"
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.9}s` }}
        />
      ))}
      {SPARKS.map(([left, top], i) => (
        <span
          key={`spark-${i}`}
          className="app-magic__spark"
          style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${(i * 0.5) % 4}s` }}
        />
      ))}
    </div>
  );
}
