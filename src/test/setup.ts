// Setup global da suite. Carregado por `setupFiles` no vitest.config.ts, antes de
// cada arquivo de teste.
//
// Aqui ficam so os matchers de DOM; os stubs de ambiente (ResizeObserver) entram
// na T2, com o teste-sentinela que prova que estao ativos.
import "@testing-library/jest-dom/vitest";
