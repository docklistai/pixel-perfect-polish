import type { DraftShift, ShiftId } from "../../types";

export type RotaGridDay = {
  d: string;
  h: string;
  c: string;
  tone: string;
  isToday: boolean;
};

export type ShiftActionHandlers = {
  onShiftOpen: (shiftId: ShiftId) => void;
  onShiftDuplicate: (shiftId: ShiftId) => void;
  onShiftRemove: (shiftId: ShiftId) => void;
  onShiftMarkOpen: (shiftId: ShiftId) => void;
};

export type ShiftPillActionHandlers = {
  onOpen: (shiftId: DraftShift["id"]) => void;
  onDuplicate: (shiftId: DraftShift["id"]) => void;
  onRemove: (shiftId: DraftShift["id"]) => void;
  onMarkOpen: (shiftId: DraftShift["id"]) => void;
};
