import type { DraftShift, DraftShiftInput, ShiftId } from "../../types";

export type MaybePromise<T> = T | Promise<T>;

export type RotaGridDay = {
  d: string;
  h: string;
  c: string;
  tone: string;
  isToday: boolean;
};

export type ShiftActionHandlers = {
  readOnly: boolean;
  serverBacked: boolean;
  onReadOnlyAttempt: () => void;
  onShiftOpen: (shiftId: ShiftId) => void;
  /** Duplicate the shift to the next day (prototype ⌘D behaviour). */
  onShiftDuplicate: (shiftId: ShiftId) => MaybePromise<void>;
  /** Remove via confirm dialog (detail-drawer path). */
  onShiftRemove: (shiftId: ShiftId) => MaybePromise<void>;
  /** Clear immediately with an undo toast (cell-menu path). */
  onShiftClear: (shiftId: ShiftId) => MaybePromise<void>;
  onShiftMarkOpen: (shiftId: ShiftId) => MaybePromise<void>;
  onShiftSetDept: (shiftId: ShiftId, dept: string) => MaybePromise<void>;
  onShiftSetColour: (shiftId: ShiftId, presetId: string) => MaybePromise<void>;
  onShiftResetColour: (shiftId: ShiftId) => MaybePromise<void>;
  onShiftAdd?: (input: DraftShiftInput) => MaybePromise<void>;
  onShiftUpdate?: (shiftId: ShiftId, patch: Partial<DraftShift>) => MaybePromise<void>;
};

/** Per-shift menu callbacks passed from the grid cell into pills and the action menu. */
export type ShiftMenuHandlers = {
  onEditInline: () => void;
  onOpen: (shiftId: ShiftId) => void;
  onDuplicate: (shiftId: ShiftId) => MaybePromise<void>;
  onMarkOpen: (shiftId: ShiftId) => MaybePromise<void>;
  onSetDept: (shiftId: ShiftId, dept: string) => MaybePromise<void>;
  onSetColour: (shiftId: ShiftId, presetId: string) => MaybePromise<void>;
  onResetColour: (shiftId: ShiftId) => MaybePromise<void>;
  onClear: (shiftId: ShiftId) => MaybePromise<void>;
};
