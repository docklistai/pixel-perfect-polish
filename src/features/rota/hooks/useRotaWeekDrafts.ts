import * as React from "react";
import { initialDraftShifts, staff } from "../data/mockData";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import type { OpenShiftSuggestion } from "../lib/rotaSuggestions";
import {
  applyShiftPatch,
  createInitialDraftShifts,
  fillOpenShiftsWithSuggestions,
  makeDraftShift,
} from "../lib/draftRota";
import { duplicateDraftShiftAsOpen } from "../lib/draftActions";
import { buildPublishedRotaSnapshot } from "../lib/publishedSnapshot";
import { createWeekDraft, type WeekDraftState } from "../lib/weekDraftState";
import { getWeekLabel } from "../lib/weekHelpers";

type Confirmation =
  | { kind: "template"; title: string; description: string; confirmLabel: string }
  | { kind: "clear"; title: string; description: string; confirmLabel: string }
  | { kind: "remove"; shiftId: ShiftId; title: string; description: string; confirmLabel: string };

export function useRotaWeekDrafts() {
  const [weekOffset, setWeekOffsetState] = React.useState(0);
  const [weekDrafts, setWeekDrafts] = React.useState<Record<string, WeekDraftState>>(() => ({
    "0": createWeekDraft(),
  }));
  const [selectedShiftId, setSelectedShiftId] = React.useState<ShiftId | null>(null);
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);

  const weekKey = String(weekOffset);
  const currentDraft = weekDrafts[weekKey] ?? weekDrafts["0"]!;

  const setCurrentDraft = React.useCallback(
    (updater: (draft: WeekDraftState) => WeekDraftState) => {
      setWeekDrafts((current) => {
        const draft = current[weekKey] ?? createWeekDraft();
        return { ...current, [weekKey]: updater(draft) };
      });
    },
    [weekKey],
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

  const setWeekOffset = (next: number | ((current: number) => number)) => {
    const resolved = typeof next === "function" ? next(weekOffset) : next;
    const key = String(resolved);
    setWeekDrafts((current) => (current[key] ? current : { ...current, [key]: createWeekDraft() }));
    setSelectedShiftId(null);
    setWeekOffsetState(resolved);
  };

  const addShift = (input: DraftShiftInput) => {
    mutateShifts((current) => [...current, makeDraftShift(input)]);
  };

  const duplicateShiftAsOpen = (id: ShiftId) => {
    mutateShifts((current) => duplicateDraftShiftAsOpen(current, id));
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
    const previousShifts = weekDrafts[String(weekOffset - 1)]?.shifts;
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
