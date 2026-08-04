/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
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
  },
});
