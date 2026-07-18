import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import {
  deriveTimeExceptions,
  minuteDelta,
  TIME_EXCEPTION_DEFINITIONS,
  TIME_EXCEPTION_GRACE_MINUTES,
} from "../lib/timeExceptions";
import { bufferedTimeRange, type TimeDateRange } from "../lib/timeQueryRange";
import type { StoredTimesheetRow } from "../types";
import { readIncompleteBreakEntryIds } from "./timeBreakFacts";
import { loadTimeRowContext, type TimeShiftVenue, type TimeStaffContext } from "./timeRowContext";

export interface TimeEntryRow {
  id: string;
  staff_member_id: string;
  shift_id: string | null;
  work_date: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  break_minutes: number;
  approval_status: "pending" | "approved" | "rejected";
}

export interface WorkspaceTimeResult {
  workspaceTimezone: string;
  rows: StoredTimesheetRow[];
}

const STATUS_MAP: Record<TimeEntryRow["approval_status"], StoredTimesheetRow["status"]> = {
  pending: "pending",
  approved: "approved",
  rejected: "unapproved",
};

function timeFormat(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clockLabel(iso: string | null, timeZone: string): string {
  return iso ? timeFormat(timeZone).format(new Date(iso)) : "—";
}

function scheduleLabel(startIso: string | null, endIso: string | null, timeZone: string): string {
  if (!startIso || !endIso) return "Unscheduled";
  const format = timeFormat(timeZone);
  return `${format.format(new Date(startIso))}-${format.format(new Date(endIso))}`;
}

function paidLabel(inIso: string | null, outIso: string | null, breakMinutes: number): string {
  if (!inIso || !outIso) return "—";
  const worked = Math.max(
    0,
    Math.floor((Date.parse(outIso) - Date.parse(inIso)) / 60_000) - breakMinutes,
  );
  return `${Math.floor(worked / 60)} h ${String(worked % 60).padStart(2, "0")} m`;
}

function deltaLabel(actual: string | null, scheduled: string | null): string {
  if (!actual) return "Missing";
  const delta = minuteDelta(actual, scheduled);
  if (delta === null) return "No published shift matched";
  if (Math.abs(delta) <= TIME_EXCEPTION_GRACE_MINUTES) return "Within 5m grace";
  const displayMinutes = Math.ceil(Math.abs(delta));
  return delta > 0 ? `+ ${displayMinutes}m` : `- ${displayMinutes}m`;
}

function avatarIndex(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 4099;
  }
  return (hash % 70) + 1;
}

function mapTimeRow(
  row: TimeEntryRow,
  staff: TimeStaffContext | undefined,
  venue: TimeShiftVenue | undefined,
  workspaceTimezone: string,
  now: Date,
  hasIncompleteBreakFact: boolean,
): StoredTimesheetRow {
  const timezone = venue?.timezone ?? staff?.timezone ?? workspaceTimezone;
  const exceptionCodes = deriveTimeExceptions({
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    clockedInAt: row.clocked_in_at,
    clockedOutAt: row.clocked_out_at,
    hasIncompleteBreak: hasIncompleteBreakFact,
    now,
  });
  const firstException = exceptionCodes[0];
  const exceptionTone = firstException ? TIME_EXCEPTION_DEFINITIONS[firstException].tone : null;
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    n: staff?.displayName ?? "Team member",
    role: staff?.roleName ?? "—",
    img: avatarIndex(row.staff_member_id),
    sched: scheduleLabel(row.scheduled_start_at, row.scheduled_end_at, timezone),
    in: clockLabel(row.clocked_in_at, timezone),
    inN: deltaLabel(row.clocked_in_at, row.scheduled_start_at),
    inTone: exceptionCodes.includes("late-clock-in") ? "warning" : undefined,
    out: clockLabel(row.clocked_out_at, timezone),
    outN: deltaLabel(row.clocked_out_at, row.scheduled_end_at),
    outTone: exceptionCodes.some((code) => code === "early-clock-out" || code === "late-finish")
      ? "warning"
      : exceptionCodes.includes("missing-clock-out")
        ? "danger"
        : undefined,
    brk: `${row.break_minutes}m`,
    paid: paidLabel(row.clocked_in_at, row.clocked_out_at, row.break_minutes),
    exc: firstException ? TIME_EXCEPTION_DEFINITIONS[firstException].label : "—",
    excTone: exceptionTone === "danger" ? "danger" : undefined,
    department: staff?.department ?? "—",
    departmentId: staff?.departmentId ?? null,
    status: STATUS_MAP[row.approval_status],
    flagged: false,
    auditTrail: [],
    workDate: row.work_date,
    timezone,
    shiftId: row.shift_id,
    scheduledStartAt: row.scheduled_start_at,
    scheduledEndAt: row.scheduled_end_at,
    clockedInAt: row.clocked_in_at,
    clockedOutAt: row.clocked_out_at,
    breakMinutes: row.break_minutes,
    exceptionCodes,
    scheduledLocationName: venue?.name ?? null,
    timezoneAuthority:
      venue?.authority === "published-schedule"
        ? "scheduled-shift"
        : venue
          ? "draft-shift-fallback"
          : "staff-primary-or-workspace",
  };
}

/** Bounded manager read: exact period plus the documented one-day edge buffer. */
export async function readWorkspaceTime(
  input: TimeDateRange & { workspaceId: string; staffMemberId?: string },
): Promise<WorkspaceTimeResult> {
  const supabase = getSupabaseServerClient();
  const buffered = bufferedTimeRange(input);
  let entriesQuery = supabase
    .from("time_entries")
    .select(
      "id, staff_member_id, shift_id, work_date, scheduled_start_at, scheduled_end_at, clocked_in_at, clocked_out_at, break_minutes, approval_status",
    )
    .eq("workspace_id", input.workspaceId)
    .gte("work_date", buffered.startDate)
    .lte("work_date", buffered.endDate)
    .order("work_date", { ascending: false })
    .order("clocked_in_at", { ascending: false, nullsFirst: false });
  if (input.staffMemberId) entriesQuery = entriesQuery.eq("staff_member_id", input.staffMemberId);

  const [{ data: entries, error: entryError }, { data: workspace, error: workspaceError }] =
    await Promise.all([
      entriesQuery,
      supabase.from("workspaces").select("timezone").eq("id", input.workspaceId).single(),
    ]);
  if (entryError) throw entryError;
  if (workspaceError) throw workspaceError;

  const workspaceTimezone = (workspace as { timezone: string | null }).timezone ?? "UTC";
  const typedEntries = (entries as TimeEntryRow[] | null) ?? [];
  const [{ staffById, venueByShiftId }, incompleteBreakEntryIds] = await Promise.all([
    loadTimeRowContext(supabase, input.workspaceId, typedEntries, workspaceTimezone),
    readIncompleteBreakEntryIds(
      supabase,
      input.workspaceId,
      typedEntries.map((entry) => entry.id),
    ),
  ]);
  const now = new Date();
  return {
    workspaceTimezone,
    rows: typedEntries.map((entry) =>
      mapTimeRow(
        entry,
        staffById.get(entry.staff_member_id),
        entry.shift_id ? venueByShiftId.get(entry.shift_id) : undefined,
        workspaceTimezone,
        now,
        incompleteBreakEntryIds.has(entry.id),
      ),
    ),
  };
}
