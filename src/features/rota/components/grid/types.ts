import type * as React from "react";
import type { DraftShift, DraftShiftInput, ShiftId } from "../../types";
import type { WorkspaceDepartment } from "../../api/workspaceDepartments";
import type { RotaCellKey } from "./selection/rotaSelectionModel";

export type MaybePromise<T> = T | Promise<T>;

/**
 * What a grid cell needs to take part in a rectangular selection. Cells receive
 * plain answers about themselves and report interactions back; they never hold
 * or reason about the rectangle.
 */
export type RotaCellSelectionApi = {
  /** False on mobile and coarse-pointer devices: cells render as they always did. */
  enabled: boolean;
  isSelected: (cell: RotaCellKey) => boolean;
  isAnchor: (cell: RotaCellKey) => boolean;
  onCellMouseDown: (event: React.MouseEvent<HTMLDivElement>, cell: RotaCellKey) => void;
  onCellFocus: (cell: RotaCellKey) => void;
  /** Returns true when the grid consumed the key and the cell should stand down. */
  onCellKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, cell: RotaCellKey) => boolean;
};

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
  /** Roles the inline editor may resolve typed role text against. */
  workspaceRoles?: readonly string[];
  /** The workspace's real active departments, for the change-department menu. */
  departments?: readonly WorkspaceDepartment[];
  /** Why "Duplicate to next day" is refused for this shift, or null when allowed. */
  duplicateBlockedReason: (shift: Pick<DraftShift, "staffId" | "dayIndex">) => string | null;
  onReadOnlyAttempt: () => void;
  onShiftOpen: (shiftId: ShiftId) => void;
  /** Duplicate the shift to the next day (prototype ⌘D behaviour). */
  onShiftDuplicate: (shiftId: ShiftId) => MaybePromise<void>;
  /** Remove via confirm dialog (detail-drawer path). */
  onShiftRemove: (shiftId: ShiftId) => MaybePromise<void>;
  /** Clear immediately with an undo toast (cell-menu path). */
  onShiftClear: (shiftId: ShiftId) => MaybePromise<void>;
  onShiftMarkOpen: (shiftId: ShiftId) => MaybePromise<void>;
  /** Legacy free-text label. Kept for existing data; not the shift department. */
  onShiftSetDept: (shiftId: ShiftId, dept: string) => MaybePromise<void>;
  /** Moves the shift into a real workspace department. */
  onShiftSetDepartment?: (shiftId: ShiftId, departmentId: string) => MaybePromise<void>;
  onShiftSetColour: (shiftId: ShiftId, presetId: string) => MaybePromise<void>;
  onShiftResetColour: (shiftId: ShiftId) => MaybePromise<void>;
  onShiftAdd?: (input: DraftShiftInput) => MaybePromise<void>;
  onShiftUpdate?: (shiftId: ShiftId, patch: Partial<DraftShift>) => MaybePromise<void>;
  /**
   * Opens the shared record-absence dialog for a person and day. Absent in demo
   * mode, where no absence can be recorded. Never edits the cell.
   */
  onRecordAbsence?: (input: { staffId: string; dayIndex: number; leaveType: "sick" }) => void;
};

/** Per-shift menu callbacks passed from the grid cell into pills and the action menu. */
export type ShiftMenuHandlers = {
  duplicateBlockedReason: ShiftActionHandlers["duplicateBlockedReason"];
  onEditInline: () => void;
  onOpen: (shiftId: ShiftId) => void;
  onDuplicate: (shiftId: ShiftId) => MaybePromise<void>;
  onMarkOpen: (shiftId: ShiftId) => MaybePromise<void>;
  onSetDept: (shiftId: ShiftId, dept: string) => MaybePromise<void>;
  onSetDepartment?: (shiftId: ShiftId, departmentId: string) => MaybePromise<void>;
  departments?: readonly WorkspaceDepartment[];
  onSetColour: (shiftId: ShiftId, presetId: string) => MaybePromise<void>;
  onResetColour: (shiftId: ShiftId) => MaybePromise<void>;
  onClear: (shiftId: ShiftId) => MaybePromise<void>;
};
