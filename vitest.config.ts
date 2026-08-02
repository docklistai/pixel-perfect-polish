import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

// Standalone Vitest config. Intentionally does NOT import the app vite config so the
// TanStack Start / Cloudflare plugin chain is not loaded in the test process.
//
// Two projects, deliberately separated:
//
//   node — deterministic logic only, no DOM. This is the original Phase 10 contract
//          and its behaviour is unchanged: `src/**/*.test.ts`, node environment.
//
//   dom  — Phase 49 added component/hook coverage for the shared record-absence
//          flow. Several required behaviours (the roster loading into the dialog,
//          the dialog staying open on refusal, a second submit being blocked while
//          one is pending) are only observable once rendered, so they cannot live
//          in the node project. Scoped to `*.test.tsx` so no existing test changes
//          environment. Components are rendered directly — never routes, which
//          would drag in the plugin chain this config exists to avoid.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          globals: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          globals: false,
          setupFiles: ["./src/test/setupDom.ts"],
        },
      },
    ],
  },
});
