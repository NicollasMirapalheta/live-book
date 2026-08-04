#!/usr/bin/env node
/**
 * Guarda do motor de virada — hook PreToolUse.
 *
 * `src/live-book/` foi afinado no commit de performance (300 páginas de ~3 para ~37 FPS
 * sob throttle 4x de CPU). AD-022 declara esses arquivos intocáveis sem uma decisão
 * explícita que a supersede.
 *
 * BLOCKED  → edição recusada; exige AD-NNN novo antes.
 * WARNED   → edição permitida, com lembrete de quais trechos continuam proibidos.
 *
 * Entrada: JSON do hook em stdin ({ tool_name, tool_input: { file_path } }).
 * Saída: exit 2 bloqueia (stderr volta para o agente); exit 0 permite.
 */

const BLOCKED = [
  "src/live-book/constants.ts",
];

const WARNED = [
  "src/live-book/livebook.tsx",
  "src/live-book/live-book.css",
  "src/live-book/usestagescale.ts",
  "src/live-book/page.tsx",
  "src/live-book/types.ts",
  "src/live-book/usepagesound.ts",
  // Leaf.tsx saiu de BLOCKED para WARNED por AD-027: liberada UMA mudança aditiva
  // (o atributo `inert` derivado das props existentes, para a a11y de teclado).
  // Todo o resto do arquivo continua proibido.
  "src/live-book/leaf.tsx",
];

const WARN_MESSAGE = `Lembrete AD-022 — este arquivo é do motor de virada.

Permitido apenas o que já foi aprovado:
  • props aditivas: style, toolbar, wheelFlip, apiRef
  • guarda de contentEditable no handler de teclado
  • reenquadramento de retrato via stageOffset (AD-005)
  • a11y aditiva autorizada (AD-019); em Leaf.tsx, SÓ o atributo inert (AD-027)

Continua PROIBIDO alterar: Face, surfaceOf, faces, toc, inWindow, surfaceCache,
angles, a geometria do CSS, e toda a lógica de ângulo/canto/arraste de Leaf.tsx.
Ver .specs/STATE.md e docs/adr/002.`;

function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", () => resolve(""));
  });
}

const raw = await readStdin();

let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  // Entrada ilegível não é motivo para travar o trabalho.
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (typeof filePath !== "string" || !filePath) process.exit(0);

// Normaliza separadores e caixa: o hook roda em Windows, os caminhos vêm mistos.
const normalized = filePath.replace(/\\/g, "/").toLowerCase();
const matches = (list) => list.some((p) => normalized.endsWith(p));

if (matches(BLOCKED)) {
  process.stderr.write(
    `Edição bloqueada: ${filePath}\n\n` +
      `AD-022 declara este arquivo intocável — ele carrega a geometria e a composição\n` +
      `3D que sustentam a performance em máquina fraca.\n\n` +
      `Para prosseguir, escreva um AD-NNN novo em .specs/STATE.md que supersede o AD-022,\n` +
      `justificando a mudança, e só então edite.\n`,
  );
  process.exit(2);
}

if (matches(WARNED)) {
  process.stdout.write(`${WARN_MESSAGE}\n`);
}

process.exit(0);
