import { defineConfig, devices } from "@playwright/test";

/**
 * Config minima do Playwright para a verificacao de performance (MEDIA-11, T19).
 *
 * O webServer builda e serve o app real (vite preview). As variaveis Supabase sao
 * FORCADAS vazias para o `pickAdapter()` cair no `LocalAdapter` offline (DATA-01
 * AC5) — o e2e semeia um album de 20 fotos sem tocar em backend. Vite da
 * precedencia a `process.env` sobre o `.env` local, entao isto vence.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 240_000,
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
  },
});
