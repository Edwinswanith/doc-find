import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: { branches: 80, functions: 80, lines: 80, statements: 80 },
      include: ["src/lib/domain/**/*.ts", "src/lib/messaging.ts"],
    },
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname, "server-only": new URL("./src/test/server-only-shim.ts", import.meta.url).pathname } },
})
