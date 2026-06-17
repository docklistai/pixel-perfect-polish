import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone Vitest config. Intentionally does NOT import the app vite config so the
// TanStack Start / Cloudflare plugin chain is not loaded in the test process. Phase 10
// covers deterministic logic only (node env, no DOM, no React component testing).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
