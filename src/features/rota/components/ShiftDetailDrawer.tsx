import * as React from "react";
import { UserMinus } from "lucide-react";
import { ActionButton, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { LeaveRequest } from "@/features/leave/types";
import { isValidShiftTimeRange } from "../lib/draftRota";
import type { RepeatShiftResult } from "../lib/repeatShift";
import type { DraftShift, ShiftId, StaffMember } from "../types";
import { useRotaRecoveryOptions } from "../hooks/useRotaRecoveryOptions";
import type { MaybePromise } from "./grid";
import { OpenShiftApplicantsSection } from "./OpenShiftApplicantsSection";
import { RepeatShiftControls } from "./RepeatShiftControls";
import { ShiftDetailFooterActions } from "./ShiftDetailFooterActions";
import { ShiftEditFormFields, type ShiftEditFormState } from "./ShiftEditFormFields";
import { ShiftPendingLeaveHint } from "./ShiftPendingLeaveHint";
import { ShiftRecoveryOptionsSection } from "./ShiftRecoveryOptionsSection";
import { ShiftReleaseRequestSection } from "./ShiftReleaseRequestSection";

type DayEntry = { d: string };

function formStateFromShift(shift: DraftShift): ShiftEditFormState {
  return {
    role: shift.role,
    start: shift.start,
    end: shift.end,
    assignTo: shift.staffId ?? "",
  };
}

export function ShiftDetailDrawer({
  shift,
  staff,
  assignableStaff,
  days,
  onClose,
  onUpdate,
  onRemove,
  onMarkOpen,
  onRepeat,
  draftShifts,
  leaveRequests,
  dayIsoDates,
  suggestedAssignTo,
  liveRotaWeekId = null,
}: {
  shift: DraftShift | null;
  staff: StaffMember[];
  assignableStaff: StaffMember[];
  days: DayEntry[];
  onClose: () => void;
  onUpdate: (id: ShiftId, patch: Partial<DraftShift>) => MaybePromise<void>;
  onRemove: (id: ShiftId) => MaybePromise<void>;
  onMarkOpen: (id: ShiftId) => MaybePromise<void>;
  onRepeat: (id: ShiftId, dayIndexes: number[]) => Promise<RepeatShiftResult | null>;
  draftShifts: DraftShift[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  suggestedAssignTo?: string | null;
  /** Live rota week id; enables the open-shift applicants review (live mode only). */
  liveRotaWeekId?: string | null;
}) {
  const [form, setForm] = React.useState<ShiftEditFormState>(() =>
    shift ? formStateFromShift(shift) : { role: "", start: "", end: "", assignTo: "" },
  );
  const [saving, setSaving] = React.useState(false);
  const [repeatActive, setRepeatActive] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (shift) {
      setForm(formStateFromShift(shift));
      setSaving(false);
      setRepeatActive(false);
      setSaveError(null);
    }
  }, [shift]);

  React.useEffect(() => {
    if (!shift || !suggestedAssignTo) return;
    setForm((current) =>
      current.assignTo === suggestedAssignTo
        ? current
        : { ...current, assignTo: suggestedAssignTo },
    );
  }, [shift, suggestedAssignTo]);

  const recoveryOptions = useRotaRecoveryOptions({
    shift,
    staff: assignableStaff,
    shifts: draftShifts,
    leaveRequests,
    dayIsoDates,
  });
  if (!shift) {
    return (
      <DrawerShell open={false} onOpenChange={(o) => !o && onClose()} title="Shift">
        <p className="text-xs text-muted-foreground">No shift selected.</p>
      </DrawerShell>
    );
  }

  const isOpen = shift.staffId === null;
  const isConflict = shift.status === "conflict";
  const dayLabel = days[shift.dayIndex]?.d ?? "";
  const staffName = isOpen
    ? "Open shift"
    : (staff.find((s) => s.id === shift.staffId)?.name ?? "Unknown");
  const currentStaff = staff.find((member) => member.id === shift.staffId);
  const currentAssignmentIsAssignable =
    shift.staffId === null || assignableStaff.some((member) => member.id === shift.staffId);
  const meta = isConflict ? (
    <StatusBadge tone="warning">Conflict</StatusBadge>
  ) : isOpen ? (
    <StatusBadge tone="info">Open shift</StatusBadge>
  ) : (
    <StatusBadge tone="success">Scheduled</StatusBadge>
  );

  const timesValid = isValidShiftTimeRange(form.start, form.end);
  const isDirty =
    form.role !== shift.role ||
    form.start !== shift.start ||
    form.end !== shift.end ||
    form.assignTo !== (shift.staffId ?? "");
  const hasValidAssignment =
    form.assignTo === "" || assignableStaff.some((member) => member.id === form.assignTo);
  const canSave = !saving && isDirty && form.role.trim() !== "" && timesValid && hasValidAssignment;
  const saveHint = !isDirty
    ? "Make a change to enable Save."
    : !form.role.trim()
      ? "Enter a role to save."
      : !timesValid
        ? "Enter a valid time range to save."
        : "";

  const handleSave = async () => {
    if (!canSave) return;
    const nextStaffId = form.assignTo === "" ? null : form.assignTo;
    setSaving(true);
    setSaveError(null);
    try {
      await onUpdate(shift.id, {
        role: form.role.trim(),
        start: form.start,
        end: form.end,
        staffId: nextStaffId,
      });
    } catch (error) {
      // The live persistence hook also raises a toast; keep the drawer open with
      // the entered fields and show the reason inline so the manager can retry.
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't save this shift. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: (id: ShiftId) => MaybePromise<void>) => {
    setSaving(true);
    setSaveError(null);
    try {
      await action(shift.id);
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "We couldn't update this shift. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerShell
      open
      onOpenChange={(o) => !o && onClose()}
      title={staffName}
      description={`${dayLabel} · ${shift.role}`}
      meta={meta}
      footer={
        <ShiftDetailFooterActions
          saving={saving}
          canSave={canSave}
          onRemove={() => void runAction(onRemove)}
          onCancel={onClose}
          onSave={() => void handleSave()}
        />
      }
    >
      <FormSection title="Edit shift">
        {saveError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger"
          >
            {saveError}
          </div>
        )}
        <ShiftPendingLeaveHint
          leaveRequests={leaveRequests}
          staffId={shift.staffId}
          dayIso={dayIsoDates[shift.dayIndex]}
        />
        <ShiftEditFormFields
          form={form}
          setForm={setForm}
          assignableStaff={assignableStaff}
          currentStaff={currentStaff}
          currentAssignmentIsAssignable={currentAssignmentIsAssignable}
          timesValid={timesValid}
          saveHint={saveHint}
          originalStaffId={shift.staffId}
        />
      </FormSection>

      {liveRotaWeekId && (
        <>
          <ShiftReleaseRequestSection rotaWeekId={liveRotaWeekId} sourceShiftId={shift.id} />
          <OpenShiftApplicantsSection rotaWeekId={liveRotaWeekId} sourceShiftId={shift.id} />
        </>
      )}

      {(isOpen || isConflict) && (
        <ShiftRecoveryOptionsSection
          options={recoveryOptions}
          onUse={(staffId) => setForm((current) => ({ ...current, assignTo: staffId }))}
        />
      )}

      <FormSection title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {!isOpen && (
            <ActionButton
              variant="secondary"
              size="sm"
              icon={UserMinus}
              disabled={saving || repeatActive}
              onClick={() => void runAction(onMarkOpen)}
            >
              Mark as open shift
            </ActionButton>
          )}
          <RepeatShiftControls
            sourceDayIndex={shift.dayIndex}
            days={days}
            disabled={saving}
            copyAllowed={currentAssignmentIsAssignable}
            onActiveChange={setRepeatActive}
            onBusyChange={setSaving}
            onRepeat={(dayIndexes) => onRepeat(shift.id, dayIndexes)}
            onSuccess={onClose}
          />
        </div>
        {!isOpen && !repeatActive && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            To reassign or open up, pick the staff member above and save. Changes stay in the draft
            until published.
          </p>
        )}
      </FormSection>
    </DrawerShell>
  );
}
