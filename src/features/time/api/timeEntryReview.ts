import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";
import { timeEntryReviewInput } from "./timeLiveSchemas";

export interface TimeReviewClockEvent {
  id: string;
  eventType: "clock_in" | "clock_out" | "break_start" | "break_end";
  source: "staff" | "manager" | "system";
  occurredAt: string;
}

export interface TimeReviewStateEvent {
  id: string;
  eventType: "created" | "adjusted" | "submitted" | "approved" | "rejected" | "reopened";
  resultingStatus: "pending" | "approved" | "rejected";
  reason: string | null;
  occurredAt: string;
}

export interface TimeReviewAdjustmentAudit {
  id: string;
  action: string;
  occurredAt: string;
  details: Record<string, string | number | boolean | null>;
}

export interface TimeEntryReviewResult {
  clockEvents: TimeReviewClockEvent[];
  stateEvents: TimeReviewStateEvent[];
  adjustmentAudits: TimeReviewAdjustmentAudit[];
}

/** Full immutable evidence for exactly one drawer-open entry. */
export const fetchTimeEntryReviewFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => timeEntryReviewInput.parse(input))
  .handler(async ({ data }): Promise<TimeEntryReviewResult> => {
    const supabase = getSupabaseServerClient();
    const [clockResult, stateResult, auditResult] = await Promise.all([
      supabase
        .from("clock_events")
        .select("id, event_type, source, occurred_at")
        .eq("workspace_id", data.workspaceId)
        .eq("time_entry_id", data.timeEntryId)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("time_entry_events")
        .select("id, event_type, resulting_approval_status, reason, occurred_at")
        .eq("workspace_id", data.workspaceId)
        .eq("time_entry_id", data.timeEntryId)
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true }),
      supabase
        .from("audit_events")
        .select("id, action, occurred_at, details")
        .eq("workspace_id", data.workspaceId)
        .eq("subject_type", "time_entry")
        .eq("subject_id", data.timeEntryId)
        .eq("action", "time_entry.adjusted")
        .order("occurred_at", { ascending: true })
        .order("id", { ascending: true }),
    ]);
    if (clockResult.error) throw clockResult.error;
    if (stateResult.error) throw stateResult.error;
    if (auditResult.error) throw auditResult.error;

    return {
      clockEvents: (
        (clockResult.data as
          | {
              id: string;
              event_type: TimeReviewClockEvent["eventType"];
              source: TimeReviewClockEvent["source"];
              occurred_at: string;
            }[]
          | null) ?? []
      ).map((event) => ({
        id: event.id,
        eventType: event.event_type,
        source: event.source,
        occurredAt: event.occurred_at,
      })),
      stateEvents: (
        (stateResult.data as
          | {
              id: string;
              event_type: TimeReviewStateEvent["eventType"];
              resulting_approval_status: TimeReviewStateEvent["resultingStatus"];
              reason: string | null;
              occurred_at: string;
            }[]
          | null) ?? []
      ).map((event) => ({
        id: event.id,
        eventType: event.event_type,
        resultingStatus: event.resulting_approval_status,
        reason: event.reason,
        occurredAt: event.occurred_at,
      })),
      adjustmentAudits: (
        (auditResult.data as
          | {
              id: string;
              action: string;
              occurred_at: string;
              details: Record<string, string | number | boolean | null>;
            }[]
          | null) ?? []
      ).map((event) => ({
        id: event.id,
        action: event.action,
        occurredAt: event.occurred_at,
        details: event.details,
      })),
    };
  });
