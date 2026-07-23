import * as React from "react";
import type { ShiftActionHandlers } from "./types";
import type { RotaGridStaffRow } from "../../types";

export type ShiftActionHandlerInput = Omit<ShiftActionHandlers, "workspaceRoles"> & {
  staffRows: readonly RotaGridStaffRow[];
  /** Roles the workspace has configured, beyond those held by staff. */
  configuredRoles?: readonly string[];
};

/**
 * Bundles the per-shift callbacks the grid hands down to every cell, and
 * resolves the role list the inline editor may treat as configured.
 *
 * The workspace's genuine roles are the ones people actually hold plus anything
 * configured elsewhere. Roles seen only on shifts are deliberately excluded: a
 * temporary label such as Training or Cover, typed onto one shift, must not
 * become "configured" just because it now appears on the grid — otherwise
 * re-editing it would stop warning, and the label would look like real
 * workspace configuration.
 *
 * Parameters are destructured so the memo depends on each callback rather than
 * the wrapper object, keeping the handler identity stable across renders.
 */
export function useShiftActionHandlers({
  staffRows,
  configuredRoles,
  readOnly,
  serverBacked,
  departments,
  canCopyShiftAssignment,
  onReadOnlyAttempt,
  onShiftOpen,
  onShiftDuplicate,
  onShiftRemove,
  onShiftClear,
  onShiftMarkOpen,
  onShiftSetDept,
  onShiftSetDepartment,
  onShiftSetColour,
  onShiftResetColour,
  onShiftAdd,
  onShiftUpdate,
}: ShiftActionHandlerInput): ShiftActionHandlers {
  const workspaceRoles = React.useMemo(() => {
    const roles = new Set<string>();
    for (const row of staffRows) {
      if (row.staff.role) roles.add(row.staff.role);
    }
    for (const role of configuredRoles ?? []) roles.add(role);
    return [...roles];
  }, [staffRows, configuredRoles]);

  return React.useMemo<ShiftActionHandlers>(
    () => ({
      readOnly,
      serverBacked,
      workspaceRoles,
      canCopyShiftAssignment,
      onReadOnlyAttempt,
      onShiftOpen,
      onShiftDuplicate,
      onShiftRemove,
      onShiftClear,
      onShiftMarkOpen,
      onShiftSetDept,
      onShiftSetDepartment,
      departments,
      onShiftSetColour,
      onShiftResetColour,
      onShiftAdd,
      onShiftUpdate,
    }),
    [
      canCopyShiftAssignment,
      departments,
      onReadOnlyAttempt,
      onShiftAdd,
      onShiftClear,
      onShiftDuplicate,
      onShiftMarkOpen,
      onShiftOpen,
      onShiftRemove,
      onShiftResetColour,
      onShiftSetColour,
      onShiftSetDepartment,
      onShiftSetDept,
      onShiftUpdate,
      readOnly,
      serverBacked,
      workspaceRoles,
    ],
  );
}
