import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { toSafeBusinessMessage } from "@/lib/safe-errors";
import type { ShiftReleaseStatus } from "../lib/shiftReleaseRequests";

export interface PortalShiftReleaseRequest {
  requestId: string;
  publishedShiftId: string;
  status: ShiftReleaseStatus;
  reason: string;
  decisionReason: string | null;
  createdAt: string;
  date: string;
  dayLabel: string;
  start: string;
  end: string;
  role: string;
  locationName: string;
}

interface ReleaseRow {
  request_id: string;
  published_shift_id: string;
  status: ShiftReleaseStatus;
  reason: string;
  decision_reason: string | null;
  created_at: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  location_name: string;
  location_timezone: string;
}

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

export async function fetchPortalShiftReleaseRequests(
  workspaceId: string,
): Promise<PortalShiftReleaseRequest[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("staff_portal_shift_release_requests")
    .select(
      "request_id, published_shift_id, status, reason, decision_reason, created_at, shift_date, starts_at, ends_at, role_name, location_name, location_timezone",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data as ReleaseRow[] | null) ?? []).map((row) => ({
    requestId: row.request_id,
    publishedShiftId: row.published_shift_id,
    status: row.status,
    reason: row.reason,
    decisionReason: row.decision_reason,
    createdAt: row.created_at,
    date: row.shift_date,
    dayLabel: dayLabel(row.shift_date),
    start: timeLabel(row.starts_at, row.location_timezone),
    end: timeLabel(row.ends_at, row.location_timezone),
    role: row.role_name,
    locationName: row.location_name,
  }));
}

export type ShiftReleaseWriteResult = { ok: true } | { ok: false; message: string };

function writeError(error: { code?: string | null; message?: string | null }): string {
  if (error.code === "42501") return "You don't have staff access to request this release.";
  if (error.code === "P0002") return "That published shift is no longer available.";
  return toSafeBusinessMessage(error, "We couldn't update the release request. Please try again.");
}

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  publishedShiftId: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
});

export const requestShiftReleaseFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }): Promise<ShiftReleaseWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { error } = await getSupabaseServerClient().rpc("rpc_request_shift_release", {
      p_workspace_id: data.workspaceId,
      p_published_shift_id: data.publishedShiftId,
      p_reason: data.reason,
    });
    return error ? { ok: false, message: writeError(error) } : { ok: true };
  });

const withdrawSchema = z.object({
  workspaceId: z.string().uuid(),
  requestId: z.string().uuid(),
});

export const withdrawShiftReleaseFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawSchema.parse(input))
  .handler(async ({ data }): Promise<ShiftReleaseWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { error } = await getSupabaseServerClient().rpc("rpc_withdraw_shift_release", {
      p_workspace_id: data.workspaceId,
      p_request_id: data.requestId,
    });
    return error ? { ok: false, message: writeError(error) } : { ok: true };
  });
