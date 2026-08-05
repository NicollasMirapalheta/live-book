/// <reference types="vitest/config" />
import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

// Reusa o mesmo plugin de React e a mesma resolucao de modulos do vite.config.ts
// (AD-016 / estrategia de testes): Vitest sobre Vite elimina uma configuracao
// paralela de transformacao.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Orcamento da spec da Fase 0: a suite e gate de cada task; lenta demais,
    // seria contornada. Nenhum teste de animacao aqui.
    css: false,
    // O harness cria um worktree aninhado em `.claude/worktrees/` — mesmo branch,
    // com node_modules proprio. Sem excluir, o Vitest varre a arvore duplicada e
    // seus testes quebram por duas copias de React (dispatcher de hooks null),
    // poluindo o gate com falhas fantasmas. Estende os excludes padrao, nao os
    // substitui.
    // `e2e/**` roda no Playwright (`.spec.ts` do MEDIA-11), nao no Vitest — o glob
    // padrao do Vitest casaria com ele e quebraria o gate unitario.
    exclude: [...configDefaults.exclude, "**/.claude/**", "e2e/**"],
  },
});
