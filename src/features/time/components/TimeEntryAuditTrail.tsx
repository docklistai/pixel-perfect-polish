import { AlertTriangle, Check, Clock3, Edit3, Loader2 } from "lucide-react";
import { FormSection } from "@/components/dl";
import type { TimeEntryReviewResult } from "../api/timeEntryReview";
import { buildTimeReviewTimeline } from "../lib/timeReviewTimeline";
import type { TimeAuditEntry } from "../types";

interface Props {
  data?: TimeEntryReviewResult;
  isLoading: boolean;
  isError: boolean;
  timezone: string;
  demoEntries: TimeAuditEntry[];
  live: boolean;
}

function eventStamp(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function TimeEntryAuditTrail({
  data,
  isLoading,
  isError,
  timezone,
  demoEntries,
  live,
}: Props) {
  if (!live) {
    return (
      <FormSection title="Audit trail">
        {demoEntries.length ? (
          <div className="space-y-2">
            {demoEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-2 text-xs">
                <div className="font-semibold">{entry.title}</div>
                <div className="text-muted-foreground">{entry.body}</div>
                <div className="mt-1 font-mono text-muted-foreground">{entry.time}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No sample audit events for this entry.</p>
        )}
      </FormSection>
    );
  }
  if (isLoading) {
    return (
      <FormSection title="Audit trail">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading entry evidence…
        </p>
      </FormSection>
    );
  }
  if (isError) {
    return (
      <FormSection title="Audit trail">
        <p className="flex items-center gap-2 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Entry evidence could not be loaded.
        </p>
      </FormSection>
    );
  }

  const timeline = data ? buildTimeReviewTimeline(data) : [];
  return (
    <FormSection title="Audit trail">
      {timeline.length > 0 ? (
        <div className="space-y-2">
          {timeline.map((event) => {
            const Icon = event.kind === "clock" ? Clock3 : event.kind === "state" ? Check : Edit3;
            return (
              <div key={event.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{event.title}</div>
                    <div className="text-[11px] text-muted-foreground">{event.body}</div>
                  </div>
                  <time className="font-mono text-[10px] text-muted-foreground">
                    {eventStamp(event.occurredAt, timezone)}
                  </time>
                </div>
                {event.evidence.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-5 text-[11px] text-muted-foreground">
                    {event.evidence.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No immutable events recorded for this entry.
        </p>
      )}
    </FormSection>
  );
}
