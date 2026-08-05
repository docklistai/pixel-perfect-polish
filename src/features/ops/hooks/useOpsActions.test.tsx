import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpsPageData } from "../types";
import { useOpsActions } from "./useOpsActions";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("useOpsActions optimistic refusal", () => {
  let client: QueryClient;
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("restores every matching Ops snapshot when the RPC refuses", async () => {
    const key = ["ops", "workspace-1", { page: 1 }];
    const page = { total: 1, entries: [], selectedEntry: null } as unknown as OpsPageData;
    client.setQueryData(key, page);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useOpsActions("workspace-1"), { wrapper });
    await act(async () => {
      expect(
        await result.current.runOptimistic(
          async () => ({ ok: false, message: "Refused" }),
          "Saved",
          (current) => ({ ...current, total: 99 }),
        ),
      ).toBe(false);
    });
    expect(client.getQueryData<OpsPageData>(key)?.total).toBe(1);
  });
});
