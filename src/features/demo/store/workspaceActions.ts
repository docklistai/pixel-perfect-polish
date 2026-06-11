import { staff } from "@/features/rota/data/mockData";
import { buildPublishedRotaSnapshot } from "@/features/rota/lib/publishedSnapshot";
import { createWeekDraft } from "@/features/rota/lib/weekDraftState";
import { getWeekLabel } from "@/features/rota/lib/weekHelpers";
import type { ClockEntry, PortalNotification } from "@/features/staff-portal/types";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
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

/**
 * Publishes the selected week: builds the staff-safe snapshot from the live
 * draft and notifies staff in the portal. The snapshot is the only rota data
 * the portal ever reads.
 */
export function publishRotaWeek(store: WorkspaceStore): void {
  store.setState((state) => {
    const key = String(state.weekOffset);
    const draft = state.weekDrafts[key] ?? createWeekDraft(state.weekOffset);
    const weekLabel = getWeekLabel(state.weekOffset);
    const snapshot = buildPublishedRotaSnapshot({
      shifts: draft.shifts,
      staff,
      weekOffset: state.weekOffset,
      weekLabel,
      previousSnapshot: draft.publishedSnapshot,
    });
    const republished = draft.publishedSnapshot !== null;
    const notification: PortalNotification = {
      id: `nt-publish-${key}-v${snapshot.version}`,
      kind: "rota-published",
      title: republished ? `Rota updated for ${weekLabel}` : `Rota published for ${weekLabel}`,
      body: republished
        ? "Your manager republished the rota. Check your shifts for changes."
        : "The rota is now live. Check your shifts.",
      postedAt: `Today, ${DEMO_WORLD.nowLabel}`,
      badge: { tone: "info", label: republished ? "Updated" : "New" },
      unread: true,
      important: true,
    };
    return {
      ...state,
      weekDrafts: {
        ...state.weekDrafts,
        [key]: {
          ...draft,
          published: true,
          hasUnpublishedChanges: false,
          publishedSnapshot: snapshot,
        },
      },
      portalNotifications: [notification, ...state.portalNotifications],
    };
  });
}

function minutesToHHMM(totalMinutes: number): string {
  const clamped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function portalClockIn(store: WorkspaceStore): void {
  store.setState((state) => ({
    ...state,
    portalClock: { clockedIn: true, onBreak: false, startedAtMs: Date.now() },
  }));
}

export function portalToggleBreak(store: WorkspaceStore): void {
  store.setState((state) =>
    state.portalClock.clockedIn
      ? {
          ...state,
          portalClock: { ...state.portalClock, onBreak: !state.portalClock.onBreak },
        }
      : state,
  );
}

/** Ends the session and records a clock entry anchored to the demo clock. */
export function portalClockOut(store: WorkspaceStore): void {
  store.setState((state) => {
    if (!state.portalClock.clockedIn) return state;
    const startedAt = state.portalClock.startedAtMs ?? Date.now();
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));
    const entry: ClockEntry = {
      id: `ce-live-${startedAt}`,
      dayLabel: DEMO_WORLD.todayShortLabel,
      clockIn: DEMO_WORLD.nowLabel,
      clockOut: minutesToHHMM(DEMO_WORLD.nowMinutes + elapsedMinutes),
      breakMinutes: 0,
      totalHours: Math.round((elapsedMinutes / 60) * 10) / 10,
    };
    return {
      ...state,
      portalClock: { clockedIn: false, onBreak: false, startedAtMs: null },
      portalClockEntries: [entry, ...state.portalClockEntries],
    };
  });
}

export function markAllPortalNotificationsRead(store: WorkspaceStore): void {
  store.setState((state) => ({
    ...state,
    portalNotifications: state.portalNotifications.map((n) =>
      n.unread ? { ...n, unread: false } : n,
    ),
  }));
}
