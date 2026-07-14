import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ShiftReleaseStatus } from "@/features/staff-portal/lib/shiftReleaseRequests";

export interface ManagerShiftReleaseRequest {
  requestId: string;
  publishedShiftId: string;
  sourceShiftId: string;
  rotaWeekId: string;
  staffMemberId: string;
  staffName: string;
  status: ShiftReleaseStatus;
  reason: string;
  decisionReason: string | null;
  createdAt: string;
  shiftDate: string;
  dayLabel: string;
  start: string;
  end: string;
  role: string;
  locationName: string;
}

interface RequestRow {
  id: string;
  published_shift_id: string;
  source_shift_id: string;
  rota_week_id: string;
  staff_member_id: string;
  status: ShiftReleaseStatus;
  reason: string;
  decision_reason: string | null;
  created_at: string;
}

interface PublishedShiftRow {
  id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  location_id: string;
}

const inputSchema = z.object({ rotaWeekId: z.string().uuid() });

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(date + "T12:00:00Z"));
}

function timeLabel(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export const fetchShiftReleaseRequestsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ManagerShiftReleaseRequest[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data: rawRequests, error: requestError } = await supabase
      .from("shift_release_requests")
      .select(
        "id, published_shift_id, source_shift_id, rota_week_id, staff_member_id, status, reason, decision_reason, created_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("rota_week_id", data.rotaWeekId)
      .order("created_at", { ascending: true });
    if (requestError) throw requestError;
    const requests = (rawRequests as RequestRow[] | null) ?? [];
    if (requests.length === 0) return [];

    const publishedIds = requests.map((request) => request.published_shift_id);
    const staffIds = requests.map((request) => request.staff_member_id);
    const [shiftResult, staffResult, locationResult, workspaceResult] = await Promise.all([
      supabase
        .from("published_rota_shifts")
        .select("id, shift_date, starts_at, ends_at, role_name, location_id")
        .eq("workspace_id", workspaceId)
        .in("id", publishedIds),
      supabase
        .from("staff_members")
        .select("id, display_name")
        .eq("workspace_id", workspaceId)
        .in("id", staffIds),
      supabase.from("locations").select("id, name, timezone").eq("workspace_id", workspaceId),
      supabase.from("workspaces").select("timezone").eq("id", workspaceId).single(),
    ]);
    if (shiftResult.error) throw shiftResult.error;
    if (staffResult.error) throw staffResult.error;
    if (locationResult.error) throw locationResult.error;
    if (workspaceResult.error) throw workspaceResult.error;

    const shifts = new Map(
      ((shiftResult.data as PublishedShiftRow[] | null) ?? []).map((row) => [row.id, row]),
    );
    const staff = new Map(
      ((staffResult.data as { id: string; display_name: string }[] | null) ?? []).map((row) => [
        row.id,
        row.display_name,
      ]),
    );
    const locations = new Map(
      (
        (locationResult.data as { id: string; name: string; timezone: string | null }[] | null) ??
        []
      ).map((row) => [row.id, row]),
    );
    const workspaceTimezone =
      (workspaceResult.data as { timezone: string | null } | null)?.timezone ?? "UTC";

    return requests.flatMap((request) => {
      const shift = shifts.get(request.published_shift_id);
      if (!shift) return [];
      const location = locations.get(shift.location_id);
      const timezone = location?.timezone ?? workspaceTimezone;
      return [
        {
          requestId: request.id,
          publishedShiftId: request.published_shift_id,
          sourceShiftId: request.source_shift_id,
          rotaWeekId: request.rota_week_id,
          staffMemberId: request.staff_member_id,
          staffName: staff.get(request.staff_member_id) ?? "Team member",
          status: request.status,
          reason: request.reason,
          decisionReason: request.decision_reason,
          createdAt: request.created_at,
          shiftDate: shift.shift_date,
          dayLabel: dayLabel(shift.shift_date),
          start: timeLabel(shift.starts_at, timezone),
          end: timeLabel(shift.ends_at, timezone),
          role: shift.role_name,
          locationName: location?.name ?? "Workspace location",
        },
      ];
    });
  });
