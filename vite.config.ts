// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { execFileSync } from "node:child_process";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { resolveBuildRevision } from "./src/lib/build-revision";

/**
 * The commit this build came from, or null when there is no Git to ask.
 *
 * A published build is made from an extracted source tree as often as from a
 * checkout, so a missing `git` is an ordinary outcome and not a build failure.
 */
function gitRevision(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

// Ordered by authority: an explicit override first, then whatever the host
// already knows, then the checkout. Anything that is not a Git object name is
// ignored, so this can never publish an environment value — see build-revision.
const APP_REVISION = resolveBuildRevision([
  process.env.APP_REVISION,
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.GITHUB_SHA,
  gitRevision(),
]);

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // Read back by /health so a deployed revision can be proved, not assumed.
    define: { __APP_REVISION__: JSON.stringify(APP_REVISION) },
  },
});
