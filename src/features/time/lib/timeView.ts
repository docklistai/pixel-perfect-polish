/**
 * Resolves what the Time page should show, keeping live and demo data strictly
 * separate. The cardinal rule: once a live (authenticated manager) read is in
 * play, the page never borrows demo rows to paper over loading or errors — it
 * shows honest live states instead. Demo rows appear only when live mode is not
 * active at all (Supabase unconfigured or signed out).
 */

import type { StoredTimesheetRow } from "../types";

export type TimeSource = "live" | "demo";
export type TimeViewState = "demo" | "live-loading" | "live-error" | "live-ready";

export interface TimeViewInput {
  /** Live mode is active: Supabase configured and an authenticated manager. */
  enabled: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  liveRows: StoredTimesheetRow[] | undefined;
  demoRows: StoredTimesheetRow[];
}

export interface TimeView {
  rows: StoredTimesheetRow[];
  source: TimeSource;
  isLoading: boolean;
  isError: boolean;
  state: TimeViewState;
}

export function resolveTimeView(input: TimeViewInput): TimeView {
  if (!input.enabled) {
    return {
      rows: input.demoRows,
      source: "demo",
      isLoading: false,
      isError: false,
      state: "demo",
    };
  }
  if (input.isSuccess) {
    return {
      rows: input.liveRows ?? [],
      source: "live",
      isLoading: false,
      isError: false,
      state: "live-ready",
    };
  }
  if (input.isError) {
    return { rows: [], source: "live", isLoading: false, isError: true, state: "live-error" };
  }
  return { rows: [], source: "live", isLoading: true, isError: false, state: "live-loading" };
}
