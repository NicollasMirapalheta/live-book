// Setup global da suite. Carregado por `setupFiles` no vitest.config.ts, antes de
// cada arquivo de teste.
import "@testing-library/jest-dom/vitest";

// jsdom nao implementa IndexedDB, e o `LocalAdapter` (contexto Data) roda sobre ele
// via `idb`. `fake-indexeddb/auto` instala uma implementacao em memoria nos globais,
// para o contrato do adapter rodar offline (design da Fase 2A). Infra de teste — a
// unica alteracao permitida neste arquivo pela AD-022.
import "fake-indexeddb/auto";

// jsdom nao implementa ResizeObserver, e `useStageScale` observa o viewport
// ([useStageScale.ts]). Sem este stub, montar o LiveBook num teste lancaria
// `ReferenceError: ResizeObserver is not defined`. E stub inerte: jsdom nao faz
// layout, entao o callback nunca dispara sozinho — os testes de caracterizacao
// sao estruturais, nao geometricos (ver spec da Fase 0).
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

// AudioContext NAO e stubado de proposito: `usePageSound` ja degrada sozinho
// quando o construtor nao existe (`if (!Ctx) return null`, usePageSound.ts:27),
// e os testes montam o livro com `sound={false}`. Stubar seria manutencao morta
// — este comentario existe para ninguem "consertar" a ausencia depois.
