/**
 * Resolves what the manager Leave page should show, keeping live and demo data
 * strictly separate. The cardinal rule mirrors the Time page: once a live
 * (authenticated manager) read is in play, the page never borrows demo requests
 * to paper over loading or errors — it shows honest live states instead. Demo
 * requests appear only when live mode is not active at all (Supabase
 * unconfigured or signed out).
 */

import type { LeaveRequest, LeaveSource } from "../types";

export type { LeaveSource };
export type LeaveViewState = "demo" | "live-loading" | "live-error" | "live-ready";

export interface LeaveViewInput {
  /** Live mode is active: Supabase configured and an authenticated manager. */
  enabled: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  liveRequests: LeaveRequest[] | undefined;
  demoRequests: LeaveRequest[];
}

export interface LeaveView {
  requests: LeaveRequest[];
  source: LeaveSource;
  state: LeaveViewState;
}

export function resolveLeaveView(input: LeaveViewInput): LeaveView {
  if (!input.enabled) {
    return { requests: input.demoRequests, source: "demo", state: "demo" };
  }
  if (input.isSuccess) {
    return { requests: input.liveRequests ?? [], source: "live", state: "live-ready" };
  }
  if (input.isError) {
    return { requests: [], source: "live", state: "live-error" };
  }
  return { requests: [], source: "live", state: "live-loading" };
}
