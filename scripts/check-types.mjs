#!/usr/bin/env node
/**
 * Gate de tipos — hook Stop.
 *
 * `npm run typecheck` é o único gate de qualidade que existe hoje sem depender de
 * suíte de testes. Rodar no Stop garante que nenhuma sessão termina deixando o projeto
 * sem compilar.
 *
 * Falha → exit 2 com os erros em stderr, para o agente corrigir antes de encerrar.
 * `stop_hook_active` evita laço: numa segunda passada consecutiva, apenas reporta.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

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

let payload = {};
try {
  payload = JSON.parse(raw || "{}");
} catch {
  /* entrada ilegível: segue e roda mesmo assim */
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Sem dependências instaladas não há o que checar.
if (!existsSync(join(projectDir, "node_modules"))) process.exit(0);

const result = spawnSync("npm", ["run", "--silent", "typecheck"], {
  cwd: projectDir,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.status === 0) process.exit(0);

const output = `${result.stdout || ""}${result.stderr || ""}`.trim();

// Segunda passada consecutiva: não insiste, só reporta, para não entrar em laço.
if (payload.stop_hook_active) {
  process.stdout.write(`typecheck ainda falhando:\n${output}\n`);
  process.exit(0);
}

process.stderr.write(
  `O typecheck falhou — o projeto não compila. Corrija antes de encerrar.\n\n${output}\n`,
);
process.exit(2);
