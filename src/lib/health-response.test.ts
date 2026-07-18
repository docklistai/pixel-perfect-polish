import { describe, expect, it } from "vitest";

import { createHealthResponse } from "./health-response";

describe("shallow health response", () => {
  it("returns a dependency-free edge liveness payload", async () => {
    const response = createHealthResponse(
      new Request("https://docklist.example/health", { method: "GET" }),
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response?.json()).toEqual({
      status: "ok",
      service: "docklist",
      scope: "edge",
    });
  });

  it("supports HEAD without a response body", async () => {
    const response = createHealthResponse(
      new Request("https://docklist.example/health", { method: "HEAD" }),
    );

    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("");
  });

  it("rejects mutation methods and ignores unrelated paths", () => {
    const post = createHealthResponse(
      new Request("https://docklist.example/health", { method: "POST" }),
    );
    const unrelated = createHealthResponse(new Request("https://docklist.example/auth"));

    expect(post?.status).toBe(405);
    expect(post?.headers.get("allow")).toBe("GET, HEAD");
    expect(unrelated).toBeUndefined();
  });
});
