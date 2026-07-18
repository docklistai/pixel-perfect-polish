/** Local (workspace-facing) yyyy-mm-dd for sensible, non-past default dates. */
export function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function validatePortalLeaveDates({
  startIso,
  endIso,
  todayIso,
}: {
  startIso: string;
  endIso: string;
  todayIso: string;
}): string | null {
  if (!startIso || !endIso) return "Choose a start and end date.";
  if (startIso < todayIso) return "Leave cannot start in the past.";
  if (endIso < startIso) return "End date must be the same as or after the start date.";
  return null;
}

export type PortalLeaveValidationError = {
  field: "dates" | "reason";
  message: string;
};

/** One validation contract shared by demo and live leave persistence. */
export function validatePortalLeaveRequest({
  startIso,
  endIso,
  todayIso,
  reason,
}: {
  startIso: string;
  endIso: string;
  todayIso: string;
  reason: string;
}): PortalLeaveValidationError | null {
  if (reason.trim().length === 0) {
    return { field: "reason", message: "Add a short note about your request." };
  }
  const dateMessage = validatePortalLeaveDates({ startIso, endIso, todayIso });
  return dateMessage ? { field: "dates", message: dateMessage } : null;
}
