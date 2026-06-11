import { createWeekDraft } from "@/features/rota/lib/weekDraftState";
import type { WorkspaceStore } from "./createWorkspaceStore";
import type { WorkspaceState } from "./workspaceStoreTypes";

function withWeekDraft(
  drafts: WorkspaceState["weekDrafts"],
  offset: number,
): WorkspaceState["weekDrafts"] {
  const key = String(offset);
  return drafts[key] ? drafts : { ...drafts, [key]: createWeekDraft(offset) };
}

/** Selects the rota week everywhere (topbar pill, rota grid), creating the draft lazily. */
export function selectRotaWeek(
  store: WorkspaceStore,
  next: number | ((current: number) => number),
): void {
  store.setState((state) => {
    const resolved = typeof next === "function" ? next(state.weekOffset) : next;
    return {
      ...state,
      weekOffset: resolved,
      weekDrafts: withWeekDraft(state.weekDrafts, resolved),
    };
  });
}
