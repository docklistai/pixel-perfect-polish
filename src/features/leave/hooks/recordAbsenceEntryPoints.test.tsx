import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

/**
 * The three shared entry points, at the wiring level.
 *
 * Phase 49's rule is that Leave, Rota and the staff profile all reach ONE action.
 * These tests hold that rule: live Leave hands off to the shared dialog instead of
 * the demo form, demo Leave is untouched, and the rota cell resolves its day index
 * to the real date the dialog will preselect.
 */

const demoCreateRequest = vi.fn();
const demoApprove = vi.fn();
const getSupabaseEnv = vi.fn();
const useRouteContext = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useRouteContext: () => useRouteContext() }),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => getSupabaseEnv(),
}));

vi.mock("@/features/demo/store/useWorkspaceStore", () => ({
  useWorkspaceSelector: () => [],
  useWorkspaceStore: () => ({}),
}));

vi.mock("../api/leaveLiveData", () => ({
  fetchWorkspaceLeaveFn: vi.fn().mockResolvedValue([]),
  decideLeaveRequestFn: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./useLeaveActions", () => ({
  useLeaveActions: () => ({
    approve: demoApprove,
    decline: vi.fn(),
    cancel: vi.fn(),
    reopen: vi.fn(),
    createRequest: demoCreateRequest,
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { useLeaveController } from "./useLeaveController";
import { useAbsenceDialogState } from "./useAbsenceDialogState";

const MEMBER_AUTH = {
  auth: { status: "member", role: "manager", workspaceId: "ws-1" },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function controllerArgs(onRecordAbsence: () => void) {
  return {
    decisionRequest: null,
    onSelectRequest: vi.fn(),
    onCloseDecision: vi.fn(),
    onCloseNewRequest: vi.fn(),
    onRecordAbsence,
  };
}

describe("Leave controller — manager create routes to the shared dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the record-absence dialog in live mode instead of the demo form", async () => {
    getSupabaseEnv.mockReturnValue({ url: "https://example.supabase.co", anonKey: "k" });
    useRouteContext.mockReturnValue(MEMBER_AUTH);
    const onRecordAbsence = vi.fn();

    const { result } = renderHook(() => useLeaveController(controllerArgs(onRecordAbsence)), {
      wrapper,
    });

    act(() => {
      result.current.createRequest({} as never);
    });

    expect(onRecordAbsence).toHaveBeenCalledTimes(1);
    // The old behaviour echoed to the demo store; that must not happen in live mode.
    expect(demoCreateRequest).not.toHaveBeenCalled();
  });

  it("leaves demo-mode Leave behaviour exactly as it was", async () => {
    // Supabase unconfigured => demo source.
    getSupabaseEnv.mockReturnValue(undefined);
    useRouteContext.mockReturnValue({ auth: { status: "anonymous" } });
    const onRecordAbsence = vi.fn();

    const { result } = renderHook(() => useLeaveController(controllerArgs(onRecordAbsence)), {
      wrapper,
    });

    expect(result.current.source).toBe("demo");

    act(() => {
      result.current.createRequest({} as never);
    });

    // Demo still drives the demo store, and never opens the live dialog.
    expect(demoCreateRequest).toHaveBeenCalledTimes(1);
    expect(onRecordAbsence).not.toHaveBeenCalled();
  });

  it("does not open the dialog for a signed-in staff member", async () => {
    getSupabaseEnv.mockReturnValue({ url: "https://example.supabase.co", anonKey: "k" });
    useRouteContext.mockReturnValue({
      auth: { status: "member", role: "staff", workspaceId: "ws-1" },
    });
    const onRecordAbsence = vi.fn();

    const { result } = renderHook(() => useLeaveController(controllerArgs(onRecordAbsence)), {
      wrapper,
    });

    // A staff role is not manager-enabled, so the page stays in demo source and
    // manager-create never reaches the live absence action.
    expect(result.current.source).toBe("demo");
    act(() => {
      result.current.createRequest({} as never);
    });
    expect(onRecordAbsence).not.toHaveBeenCalled();
  });
});

describe("Rota inline entry — day index resolves to the dialog's date", () => {
  it("preselects the staff member and the cell's real calendar day", () => {
    const { result } = renderHook(() => useAbsenceDialogState("2026-08-03"));

    act(() => {
      // dayIndex 2 on a Monday-start week is the Wednesday.
      result.current.open({ staffId: "staff-a", dayIndex: 2, leaveType: "sick" });
    });

    expect(result.current.props.open).toBe(true);
    expect(result.current.props.defaultStaffMemberId).toBe("staff-a");
    expect(result.current.props.defaultStartDate).toBe("2026-08-05");
  });

  it("resolves the last day of the week without rolling into the next month wrongly", () => {
    const { result } = renderHook(() => useAbsenceDialogState("2026-08-31"));

    act(() => {
      result.current.open({ staffId: "staff-b", dayIndex: 6, leaveType: "sick" });
    });

    expect(result.current.props.defaultStartDate).toBe("2026-09-06");
  });

  it("preselects the person but no date when opened without a day (staff profile)", () => {
    const { result } = renderHook(() => useAbsenceDialogState(null));

    act(() => {
      result.current.open({ staffId: "staff-c" });
    });

    expect(result.current.props.open).toBe(true);
    expect(result.current.props.defaultStaffMemberId).toBe("staff-c");
    expect(result.current.props.defaultStartDate).toBeUndefined();
  });

  it("closes through the same state, so the dialog is reusable", () => {
    const { result } = renderHook(() => useAbsenceDialogState("2026-08-03"));

    act(() => {
      result.current.open({ staffId: "staff-a", dayIndex: 0 });
    });
    expect(result.current.props.open).toBe(true);

    act(() => {
      result.current.props.onOpenChange(false);
    });
    expect(result.current.props.open).toBe(false);
  });
});
