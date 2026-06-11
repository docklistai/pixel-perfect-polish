import * as React from "react";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { selectRotaWeek } from "@/features/demo/store/workspaceActions";
import { initialDraftShifts, staff } from "../data/mockData";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import type { OpenShiftSuggestion } from "../lib/rotaSuggestions";
import {
  applyShiftPatch,
  createInitialDraftShifts,
  fillOpenShiftsWithSuggestions,
  makeDraftShift,
} from "../lib/draftRota";
import { copyShiftToNextDay, duplicateDraftShiftAsOpen } from "../lib/draftActions";
import { buildPublishedRotaSnapshot } from "../lib/publishedSnapshot";
import { createWeekDraft, type WeekDraftState } from "../lib/weekDraftState";
import { getWeekLabel } from "../lib/weekHelpers";

type Confirmation =
  | { kind: "template"; title: string; description: string; confirmLabel: string }
  | { kind: "clear"; title: string; description: string; confirmLabel: string }
  | { kind: "remove"; shiftId: ShiftId; title: string; description: string; confirmLabel: string };

/**
 * Rota week drafts live in the workspace store so edits and published
 * snapshots survive navigation and feed the staff portal. Only transient UI
 * state (selection, confirm dialogs) stays local to the route.
 */
export function useRotaWeekDrafts() {
  const store = useWorkspaceStore();
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const [selectedShiftId, setSelectedShiftId] = React.useState<ShiftId | null>(null);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);

  const currentDraft = weekDrafts[String(weekOffset)] ?? weekDrafts["0"]!;

  const setCurrentDraft = React.useCallback(
    (updater: (draft: WeekDraftState) => WeekDraftState) => {
      store.setState((state) => {
        const key = String(state.weekOffset);
        const draft = state.weekDrafts[key] ?? createWeekDraft(state.weekOffset);
        return { ...state, weekDrafts: { ...state.weekDrafts, [key]: updater(draft) } };
      });
    },
    [store],
  );

  const mutateShifts = React.useCallback(
    (updater: (shifts: DraftShift[]) => DraftShift[]) => {
      setCurrentDraft((draft) => ({
        ...draft,
        shifts: updater(draft.shifts),
        hasUnpublishedChanges: true,
      }));
    },
    [setCurrentDraft],
  );

  const setWeekOffset = React.useCallback(
    (next: number | ((current: number) => number)) => {
      selectRotaWeek(store, next);
      setSelectedShiftId(null);
    },
    [store],
  );

  // Deselect the shift drawer when the week changes from anywhere (e.g. the
  // topbar week pill, which writes to the same store).
  React.useEffect(() => {
    setSelectedShiftId(null);
  }, [weekOffset]);

  const addShift = (input: DraftShiftInput) => {
    mutateShifts((current) => [...current, makeDraftShift(input)]);
  };

  const duplicateShiftAsOpen = (id: ShiftId) => {
    mutateShifts((current) => duplicateDraftShiftAsOpen(current, id));
  };

  const duplicateShiftToNextDay = (id: ShiftId): ShiftId | null => {
    const source = currentDraft.shifts.find((shift) => shift.id === id);
    if (!source) return null;
    const copy = copyShiftToNextDay(source);
    mutateShifts((current) => [...current, copy]);
    return copy.id;
  };

  const restoreShift = (shift: DraftShift) => {
    mutateShifts((current) =>
      current.some((existing) => existing.id === shift.id) ? current : [...current, shift],
    );
  };

  const updateShift = (id: ShiftId, patch: Partial<DraftShift>) => {
    mutateShifts((current) =>
      current.map((shift) => (shift.id === id ? applyShiftPatch(shift, patch) : shift)),
    );
  };

  const applyStandardTemplate = () => {
    setCurrentDraft((draft) => ({
      ...draft,
      shifts: createInitialDraftShifts(initialDraftShifts),
      hasUnpublishedChanges: true,
    }));
  };

  const copyPreviousWeek = () => {
    const previousShifts = store.getState().weekDrafts[String(weekOffset - 1)]?.shifts;
    const shifts = previousShifts
      ? previousShifts.map(({ id: _id, ...shift }) => makeDraftShift(shift))
      : createInitialDraftShifts(initialDraftShifts);

    setCurrentDraft((draft) => ({
      ...draft,
      shifts,
      hasUnpublishedChanges: true,
    }));
  };

  const applyOpenShiftSuggestions = (): OpenShiftSuggestion[] => {
    const result = fillOpenShiftsWithSuggestions(currentDraft.shifts, staff);
    setCurrentDraft((draft) => ({
      ...draft,
      shifts: fillOpenShiftsWithSuggestions(draft.shifts, staff).shifts,
      hasUnpublishedChanges: true,
    }));
    return result.suggestions;
  };

  const removeShiftNow = (id: ShiftId) => {
    mutateShifts((current) => current.filter((shift) => shift.id !== id));
    if (selectedShiftId === id) setSelectedShiftId(null);
  };

  const requestRemoveShift = (id: ShiftId) => {
    setConfirmation({
      kind: "remove",
      shiftId: id,
      title: "Remove this shift?",
      description: "This removes the shift from this week's draft.",
      confirmLabel: "Remove shift",
    });
  };

  const requestApplyStandardTemplate = () => {
    if (!currentDraft.hasUnpublishedChanges && !currentDraft.published) {
      applyStandardTemplate();
      return;
    }
    setConfirmation({
      kind: "template",
      title: "Apply standard cover?",
      description: "This replaces this week's draft with the standard pattern.",
      confirmLabel: "Apply template",
    });
  };

  // Generate dialog already shows a preview-and-confirm step,
  // so it can apply directly without a second ConfirmDialog.

  const requestClearWeek = () => {
    setConfirmation({
      kind: "clear",
      title: "Clear this week?",
      description: "This removes every shift from the current week only.",
      confirmLabel: "Clear week",
    });
  };

  const confirmPendingAction = () => {
    if (confirmation?.kind === "template") applyStandardTemplate();
    if (confirmation?.kind === "clear") {
      setCurrentDraft((draft) => ({
        ...draft,
        shifts: [],
        hasUnpublishedChanges: true,
      }));
      setSelectedShiftId(null);
    }
    if (confirmation?.kind === "remove") removeShiftNow(confirmation.shiftId);
    setConfirmation(null);
  };

  const handlePublish = () => {
    setCurrentDraft((draft) => ({
      ...draft,
      published: true,
      hasUnpublishedChanges: false,
      publishedSnapshot: buildPublishedRotaSnapshot({
        shifts: draft.shifts,
        staff,
        weekOffset,
        weekLabel: getWeekLabel(weekOffset),
        previousSnapshot: draft.publishedSnapshot,
      }),
    }));
  };

  return {
    weekOffset,
    setWeekOffset,
    weekLabel: getWeekLabel(weekOffset),
    draftShifts: currentDraft.shifts,
    published: currentDraft.published,
    hasUnpublishedChanges: currentDraft.hasUnpublishedChanges,
    publishedSnapshot: currentDraft.publishedSnapshot,
    selectedShiftId,
    setSelectedShiftId,
    closeShiftDetail: () => setSelectedShiftId(null),
    addShift,
    duplicateShiftAsOpen,
    duplicateShiftToNextDay,
    removeShiftNow,
    restoreShift,
    updateShift,
    markShiftOpen: (id: ShiftId) =>
      updateShift(id, { staffId: null, status: "open", tone: "open" }),
    requestRemoveShift,
    requestApplyStandardTemplate,
    copyPreviousWeek,
    applyOpenShiftSuggestions,
    requestClearWeek,
    handlePublish,
    confirmation,
    confirmPendingAction,
    clearConfirmation: () => setConfirmation(null),
  };
}
