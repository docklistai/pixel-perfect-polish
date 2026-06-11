import type { WeekDraftState } from "@/features/rota/lib/weekDraftState";

/**
 * Single in-memory truth for the demo workspace. Routes and the staff portal
 * read from this state; publishing, approvals, and decisions mutate it so
 * every surface (Home, sidebar, Time, Leave, Reports, notifications, portal)
 * stays coherent for the lifetime of the session.
 */
export type WorkspaceState = {
  /** Selected rota week (0 = current week, 1 = next-week draft). */
  weekOffset: number;
  /** Per-week rota drafts and their published snapshots, keyed by offset. */
  weekDrafts: Record<string, WeekDraftState>;
};
