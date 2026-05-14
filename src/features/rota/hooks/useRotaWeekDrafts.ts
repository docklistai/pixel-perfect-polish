import * as React from "react";
import { initialDraftShifts, staff } from "../data/mockData";
import type { DraftShift, DraftShiftInput, ShiftId } from "../types";
import {
  applyShiftPatch,
  createInitialDraftShifts,
  fillOpenShiftsWithSuggestions,
  makeDraftShift,
} from "../lib/draftRota";
import { getWeekLabel } from "../lib/weekHelpers";

type WeekDraftState = {
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
};

type Confirmation =
  | { kind: "template"; title: string; description: string; confirmLabel: string }
  | { kind: "fill"; title: string; description: string; confirmLabel: string }
  | { kind: "remove"; shiftId: ShiftId; title: string; description: string; confirmLabel: string };

function createWeekDraft(): WeekDraftState {
  return {
    shifts: createInitialDraftShifts(initialDraftShifts),
    published: false,
    hasUnpublishedChanges: false,
  };
}

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

  const applyOpenShiftSuggestions = () => {
    setCurrentDraft((draft) => ({
      ...draft,
      shifts: fillOpenShiftsWithSuggestions(draft.shifts, staff).shifts,
      hasUnpublishedChanges: true,
    }));
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
      description: "This removes the shift from the local draft for this week.",
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
      description: "This replaces the current local draft for this week with the standard pattern.",
      confirmLabel: "Apply template",
    });
  };

  const requestApplyOpenShiftSuggestions = () => {
    setConfirmation({
      kind: "fill",
      title: "Apply suggested cover?",
      description: "This assigns suggested staff to open shifts in the local draft.",
      confirmLabel: "Apply suggestions",
    });
  };

  const confirmPendingAction = () => {
    if (confirmation?.kind === "template") applyStandardTemplate();
    if (confirmation?.kind === "fill") applyOpenShiftSuggestions();
    if (confirmation?.kind === "remove") removeShiftNow(confirmation.shiftId);
    setConfirmation(null);
  };

  const handlePublish = () => {
    setCurrentDraft((draft) => ({ ...draft, published: true, hasUnpublishedChanges: false }));
  };

  return {
    weekOffset,
    setWeekOffset,
    weekLabel: getWeekLabel(weekOffset),
    draftShifts: currentDraft.shifts,
    published: currentDraft.published,
    hasUnpublishedChanges: currentDraft.hasUnpublishedChanges,
    selectedShiftId,
    setSelectedShiftId,
    closeShiftDetail: () => setSelectedShiftId(null),
    addShift,
    updateShift,
    markShiftOpen: (id: ShiftId) =>
      updateShift(id, { staffId: null, status: "open", tone: "open" }),
    requestRemoveShift,
    requestApplyStandardTemplate,
    requestApplyOpenShiftSuggestions,
    handlePublish,
    confirmation,
    confirmPendingAction,
    clearConfirmation: () => setConfirmation(null),
  };
}
