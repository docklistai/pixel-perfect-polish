import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { resetIdentityScopedClientState } from "./identityBoundary";

describe("resetIdentityScopedClientState", () => {
  it("drops every cached query so the next principal starts cold", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["staff", "workspace-roster", "ws-a"], [{ id: "s1" }]);
    queryClient.setQueryData(["rota", "workspace-week", "ws-a", 0, null], { shifts: [] });
    queryClient.setQueryData(["manager-identity"], { email: "a@example.com" });

    await resetIdentityScopedClientState(queryClient);

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getQueryData(["manager-identity"])).toBeUndefined();
  });

  it("cancels in-flight queries before clearing", async () => {
    const queryClient = new QueryClient();
    let settled = false;
    const pending = queryClient.fetchQuery({
      queryKey: ["rota", "workspace-week", "ws-a", 0, null],
      queryFn: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ shifts: [] }), 5_000);
        }),
    });
    pending.catch(() => {
      settled = true;
    });

    await resetIdentityScopedClientState(queryClient);

    // The cancelled fetch must not have written anything into the cache.
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    await Promise.resolve();
    expect(settled).toBe(true);
  });
});
