import type { DraftShift, DraftShiftInput, ShiftId } from "../../types";

export type RotaGridDay = {
  d: string;
  h: string;
  c: string;
  tone: string;
  isToday: boolean;
};

export type ShiftActionHandlers = {
  onShiftOpen: (shiftId: ShiftId) => void;
  /** Duplicate the shift to the next day (prototype ⌘D behaviour). */
  onShiftDuplicate: (shiftId: ShiftId) => void;
  /** Remove via confirm dialog (detail-drawer path). */
  onShiftRemove: (shiftId: ShiftId) => void;
  /** Clear immediately with an undo toast (cell-menu path). */
  onShiftClear: (shiftId: ShiftId) => void;
  onShiftMarkOpen: (shiftId: ShiftId) => void;
  onShiftSetDept: (shiftId: ShiftId, dept: string) => void;
  onShiftSetColour: (shiftId: ShiftId, presetId: string) => void;
  onShiftResetColour: (shiftId: ShiftId) => void;
  onShiftAdd?: (input: DraftShiftInput) => void;
  onShiftUpdate?: (shiftId: ShiftId, patch: Partial<DraftShift>) => void;
};

/** Per-shift menu callbacks passed from the grid cell into pills and the action menu. */
export type ShiftMenuHandlers = {
  onEditInline: () => void;
  onOpen: (shiftId: ShiftId) => void;
  onDuplicate: (shiftId: ShiftId) => void;
  onMarkOpen: (shiftId: ShiftId) => void;
  onSetDept: (shiftId: ShiftId, dept: string) => void;
  onSetColour: (shiftId: ShiftId, presetId: string) => void;
  onResetColour: (shiftId: ShiftId) => void;
  onClear: (shiftId: ShiftId) => void;
};
