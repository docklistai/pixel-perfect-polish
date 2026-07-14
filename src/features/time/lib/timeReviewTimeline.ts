import type { TimeEntryReviewResult } from "../api/timeEntryReview";

export interface TimeReviewTimelineItem {
  id: string;
  occurredAt: string;
  title: string;
  body: string;
  evidence: string[];
  kind: "clock" | "state" | "adjustment";
}

const CLOCK_LABEL: Record<TimeEntryReviewResult["clockEvents"][number]["eventType"], string> = {
  clock_in: "Clocked in",
  clock_out: "Clocked out",
  break_start: "Break started",
  break_end: "Break ended",
};

const STATE_LABEL: Record<TimeEntryReviewResult["stateEvents"][number]["eventType"], string> = {
  created: "Entry created",
  adjusted: "Manager adjustment recorded",
  submitted: "Entry submitted",
  approved: "Entry approved",
  rejected: "Returned for correction",
  reopened: "Approval reopened",
};

function evidenceValue(value: string | number | boolean | null): string {
  if (value === null || value === "") return "Not set";
  return String(value);
}

function adjustmentEvidence(details: Record<string, string | number | boolean | null>): string[] {
  const pairs = [
    ["Clock in", "previous_clocked_in_at", "clocked_in_at"],
    ["Clock out", "previous_clocked_out_at", "clocked_out_at"],
    ["Break minutes", "previous_break_minutes", "break_minutes"],
    ["Approval", "previous_approval_status", null],
  ] as const;
  return pairs.flatMap(([label, beforeKey, afterKey]) => {
    if (!(beforeKey in details) && (!afterKey || !(afterKey in details))) return [];
    const before = evidenceValue(details[beforeKey] ?? null);
    if (!afterKey) return [`${label}: ${before}`];
    return [`${label}: ${before} → ${evidenceValue(details[afterKey] ?? null)}`];
  });
}

export function buildTimeReviewTimeline(data: TimeEntryReviewResult): TimeReviewTimelineItem[] {
  const items: TimeReviewTimelineItem[] = [
    ...data.clockEvents.map((event) => ({
      id: `clock-${event.id}`,
      occurredAt: event.occurredAt,
      title: CLOCK_LABEL[event.eventType],
      body: `${event.source[0]!.toUpperCase()}${event.source.slice(1)} clock event`,
      evidence: [],
      kind: "clock" as const,
    })),
    ...data.stateEvents.map((event) => ({
      id: `state-${event.id}`,
      occurredAt: event.occurredAt,
      title: STATE_LABEL[event.eventType],
      body: event.reason ?? `Resulting status: ${event.resultingStatus}`,
      evidence: [],
      kind: "state" as const,
    })),
    ...data.adjustmentAudits.map((event) => ({
      id: `audit-${event.id}`,
      occurredAt: event.occurredAt,
      title: "Adjustment evidence",
      body: typeof event.details.reason === "string" ? event.details.reason : "Manager adjustment",
      evidence: adjustmentEvidence(event.details),
      kind: "adjustment" as const,
    })),
  ];
  return items.sort(
    (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id),
  );
}
