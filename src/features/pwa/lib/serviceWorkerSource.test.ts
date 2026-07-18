import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("production service-worker activation", () => {
  it("waits for an explicit safe-boundary message before skipWaiting", () => {
    const installBlock = source.slice(
      source.indexOf('addEventListener("install"'),
      source.indexOf('addEventListener("activate"'),
    );
    const messageBlock = source.slice(
      source.indexOf('addEventListener("message"'),
      source.indexOf('addEventListener("fetch"'),
    );

    expect(installBlock).not.toContain("skipWaiting");
    expect(messageBlock).toContain('event.data === "SKIP_WAITING"');
    expect(messageBlock).toContain("self.skipWaiting()");
  });
});
