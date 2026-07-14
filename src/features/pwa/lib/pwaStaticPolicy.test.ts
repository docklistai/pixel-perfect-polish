import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicFile = (name: string) =>
  readFileSync(new URL(`../../../../public/${name}`, import.meta.url), "utf8");

describe("minimal safe PWA policy", () => {
  it("starts on the staff portal and declares required icon purposes", () => {
    const manifest = JSON.parse(publicFile("manifest.webmanifest")) as {
      start_url: string;
      icons: Array<{ sizes: string; purpose: string }>;
    };
    expect(manifest.start_url).toBe("/portal");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
  });

  it("caches only hashed build assets and the honest navigation fallback", () => {
    const worker = publicFile("sw.js");
    expect(worker).toContain("HASHED_ASSET_PATTERN");
    expect(worker).toContain('request.mode === "navigate"');
    expect(worker).toContain("fetch(request).catch(() => caches.match(OFFLINE_URL))");
    expect(worker).toContain("SENSITIVE_PATH_PATTERN");
    expect(worker).not.toContain("backgroundSync");
    expect(worker).not.toContain("push");
  });

  it("states that tenant data is unavailable offline", () => {
    const offline = publicFile("offline.html");
    expect(offline).toContain("Tenant data is not stored for offline use");
    expect(offline).toContain("rota, staff, time, leave, notifications and");
  });
});
