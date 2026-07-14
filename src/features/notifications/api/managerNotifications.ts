import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ManagerNotificationRecord {
  id: string;
  kind: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  readAt: string | null;
  staffMemberId: string | null;
  rotaWeekOffset: number | null;
  rotaLocationId: string | null;
}

export const MANAGER_NOTIFICATION_LIMIT = 100;

const listInput = z.object({ limit: z.number().int().min(1).max(MANAGER_NOTIFICATION_LIMIT) });
const markOneInput = z.object({ notificationId: z.string().uuid() });

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function localIsoDate(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function mondayIso(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function weekOffset(todayIso: string, weekStartIso: string): number {
  return Math.round(
    (Date.parse(`${weekStartIso}T12:00:00Z`) - Date.parse(`${mondayIso(todayIso)}T12:00:00Z`)) /
      (7 * 86_400_000),
  );
}

async function managerClient() {
  const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
  const { requireActiveManagerWorkspaceId } =
    await import("@/features/auth/api/activeManagerWorkspace");
  const supabase = getSupabaseServerClient();
  const workspaceId = await requireActiveManagerWorkspaceId(supabase);
  return { supabase, workspaceId };
}

export const fetchManagerUnreadCountFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { supabase, workspaceId } = await managerClient();
    const { count, error } = await supabase
      .from("staff_portal_notifications")
      .select("notification_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("read_at", null);

    if (error) throw error;
    return count ?? 0;
  },
);

export const fetchManagerNotificationsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listInput.parse(input))
  .handler(async ({ data }): Promise<ManagerNotificationRecord[]> => {
    const { supabase, workspaceId } = await managerClient();
    const { data: rows, error } = await supabase
      .from("staff_portal_notifications")
      .select(
        "notification_id, kind, title, body, related_entity_type, related_entity_id, created_at, read_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (error) throw error;
    const notificationRows =
      (rows as Array<{
        notification_id: string;
        kind: string;
        title: string;
        body: string;
        related_entity_type: string | null;
        related_entity_id: string | null;
        created_at: string;
        read_at: string | null;
      }> | null) ?? [];

    const unavailabilityIds = unique(
      notificationRows.map((row) =>
        row.related_entity_type === "one_off_unavailability" ? row.related_entity_id : null,
      ),
    );
    const releaseIds = unique(
      notificationRows.map((row) =>
        row.related_entity_type === "shift_release_request" ? row.related_entity_id : null,
      ),
    );
    const directRotaWeekIds = unique(
      notificationRows.map((row) =>
        row.related_entity_type === "rota_week" ? row.related_entity_id : null,
      ),
    );

    const staffByUnavailabilityId = new Map<string, string>();
    if (unavailabilityIds.length > 0) {
      const { data: requests, error: requestsError } = await supabase
        .from("staff_one_off_unavailability_requests")
        .select("id, staff_member_id")
        .eq("workspace_id", workspaceId)
        .in("id", unavailabilityIds);
      if (requestsError) throw requestsError;
      for (const request of requests ?? []) {
        staffByUnavailabilityId.set(request.id, request.staff_member_id);
      }
    }

    const rotaWeekByReleaseId = new Map<string, string>();
    if (releaseIds.length > 0) {
      const { data: requests, error: requestsError } = await supabase
        .from("shift_release_requests")
        .select("id, rota_week_id")
        .eq("workspace_id", workspaceId)
        .in("id", releaseIds);
      if (requestsError) throw requestsError;
      for (const request of requests ?? []) {
        rotaWeekByReleaseId.set(request.id, request.rota_week_id);
      }
    }

    const rotaWeekIds = unique([...directRotaWeekIds, ...rotaWeekByReleaseId.values()]);
    const rotaContextByWeekId = new Map<
      string,
      { weekStart: string; locationId: string; timezone: string }
    >();
    if (rotaWeekIds.length > 0) {
      const { data: weeks, error: weeksError } = await supabase
        .from("rota_weeks")
        .select("id, week_start, location_id")
        .eq("workspace_id", workspaceId)
        .in("id", rotaWeekIds);
      if (weeksError) throw weeksError;
      const locationIds = unique((weeks ?? []).map((week) => week.location_id));
      const locationResult = locationIds.length
        ? await supabase
            .from("locations")
            .select("id, timezone")
            .eq("workspace_id", workspaceId)
            .in("id", locationIds)
        : { data: [], error: null };
      if (locationResult.error) throw locationResult.error;
      const timezoneByLocation = new Map(
        (locationResult.data ?? []).map((location) => [location.id, location.timezone]),
      );
      for (const week of weeks ?? []) {
        const timezone = timezoneByLocation.get(week.location_id);
        if (timezone) {
          rotaContextByWeekId.set(week.id, {
            weekStart: week.week_start,
            locationId: week.location_id,
            timezone,
          });
        }
      }
    }

    return notificationRows.map((row) => {
      const rotaWeekId =
        row.related_entity_type === "rota_week"
          ? row.related_entity_id
          : row.related_entity_type === "shift_release_request" && row.related_entity_id
            ? (rotaWeekByReleaseId.get(row.related_entity_id) ?? null)
            : null;
      const rotaContext = rotaWeekId ? rotaContextByWeekId.get(rotaWeekId) : undefined;
      return {
        id: row.notification_id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        relatedEntityType: row.related_entity_type,
        relatedEntityId: row.related_entity_id,
        createdAt: row.created_at,
        readAt: row.read_at,
        staffMemberId:
          row.related_entity_type === "one_off_unavailability" && row.related_entity_id
            ? (staffByUnavailabilityId.get(row.related_entity_id) ?? null)
            : null,
        rotaWeekOffset: rotaContext
          ? weekOffset(localIsoDate(rotaContext.timezone), rotaContext.weekStart)
          : null,
        rotaLocationId: rotaContext?.locationId ?? null,
      };
    });
  });

type UpdateResult = { ok: true } | { ok: false; message: string };

async function markRead(notificationId?: string): Promise<UpdateResult> {
  const { supabase, workspaceId } = await managerClient();
  let update = supabase
    .from("notification_deliveries")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .is("read_at", null);
  if (notificationId) update = update.eq("notification_id", notificationId);
  const { error } = await update;
  return error
    ? { ok: false, message: "We couldn't update your notifications. Please try again." }
    : { ok: true };
}

export const markManagerNotificationReadFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => markOneInput.parse(input))
  .handler(({ data }) => markRead(data.notificationId));

export const markAllManagerNotificationsReadFn = createServerFn({ method: "POST" }).handler(() =>
  markRead(),
);
