import * as React from "react";

interface OpenAbsenceInput {
  staffId: string;
  /** 0-based day offset from the week start, as the rota grid numbers days. */
  dayIndex?: number;
  leaveType?: "sick";
}

/**
 * Week start + day offset, as a calendar date.
 *
 * Deliberately all-UTC. Parsing "2026-08-03T00:00:00" yields LOCAL midnight, and
 * toISOString() then converts back to UTC — so anywhere east of Greenwich (including
 * Europe/London in summer, this app's own default timezone) the calendar day slipped
 * backwards and the rota cell preselected the wrong day. Date.UTC keeps the
 * arithmetic on the calendar, where it belongs.
 */
function addDays(weekStartIso: string, dayIndex: number): string | undefined {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartIso);
  if (!parts) return undefined;
  const startUtcMs = Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const shifted = new Date(startUtcMs + dayIndex * 86_400_000);
  if (Number.isNaN(shifted.getTime())) return undefined;
  return shifted.toISOString().slice(0, 10);
}

/**
 * Open/close state for the shared record-absence dialog, with the rota's day
 * index resolved to a real date. Used by Rota and the staff profile so neither
 * needs its own dialog wiring.
 */
export function useAbsenceDialogState(weekStartIso?: string | null) {
  const [open, setOpen] = React.useState(false);
  const [staffMemberId, setStaffMemberId] = React.useState<string | undefined>();
  const [startDate, setStartDate] = React.useState<string | undefined>();

  const openDialog = React.useCallback(
    (input: OpenAbsenceInput) => {
      setStaffMemberId(input.staffId);
      setStartDate(
        weekStartIso && input.dayIndex !== undefined
          ? addDays(weekStartIso, input.dayIndex)
          : undefined,
      );
      setOpen(true);
    },
    [weekStartIso],
  );

  return {
    open: openDialog,
    props: {
      open,
      onOpenChange: setOpen,
      defaultStaffMemberId: staffMemberId,
      defaultStartDate: startDate,
    },
  };
}
