import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Só lógica pura é testada (regras de urgência, cálculos, schemas,
 * integridade da mock data) — daí `environment: "node"` e nada de jsdom.
 * Sem testes de componentes nem E2E nesta fase.
 *
 * O fuso do processo é deixado de propósito por fixar: a aritmética de datas é
 * feita sobre strings ancoradas em UTC e o único ponto sensível a fuso
 * (`todayIso`) nomeia `Europe/Lisbon` explicitamente. Correr os testes num
 * processo em UTC — como acontece em CI e na Vercel, enquanto o Sny e o Bino
 * estão em Lisboa — é precisamente o caso que interessa validar.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
