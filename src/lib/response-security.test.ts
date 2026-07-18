import { describe, expect, it } from "vitest";

import { applyResponseSecurity } from "./response-security";

describe("application response security", () => {
  it("adds baseline headers and disables storage for HTML over HTTPS", async () => {
    const request = new Request("https://docklist.example/rota", {
      headers: { accept: "text/html" },
    });
    const response = new Response("<html>rota</html>", {
      headers: { "content-type": "text/html; charset=utf-8", "x-existing": "kept" },
    });

    const secured = applyResponseSecurity(response, request, "req-test-reference");

    expect(await secured.text()).toBe("<html>rota</html>");
    expect(secured.headers.get("x-existing")).toBe("kept");
    expect(secured.headers.get("x-request-id")).toBe("req-test-reference");
    expect(secured.headers.get("cache-control")).toBe("private, no-store");
    expect(secured.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(secured.headers.get("content-security-policy-report-only")).toContain(
      "frame-ancestors 'none'",
    );
    expect(secured.headers.has("x-frame-options")).toBe(false);
    expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("disables storage for JSON and responses that set cookies", () => {
    const json = applyResponseSecurity(
      Response.json({ ok: true }),
      new Request("https://docklist.example/_server/action"),
      "req-json",
    );
    const redirect = applyResponseSecurity(
      new Response(null, { headers: { "set-cookie": "session=value" }, status: 302 }),
      new Request("https://docklist.example/auth"),
      "req-cookie",
    );

    expect(json.headers.get("cache-control")).toBe("private, no-store");
    expect(redirect.headers.get("cache-control")).toBe("private, no-store");
  });

  it("preserves explicit caching for static assets", () => {
    const response = new Response("asset", {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": "text/javascript",
      },
    });

    const secured = applyResponseSecurity(
      response,
      new Request("https://docklist.example/assets/app-12345678.js"),
      "req-asset",
    );

    expect(secured.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("does not emit HSTS for local HTTP development", () => {
    const secured = applyResponseSecurity(
      new Response("ok"),
      new Request("http://localhost:8080/health"),
      "req-local",
    );

    expect(secured.headers.has("strict-transport-security")).toBe(false);
  });
});
