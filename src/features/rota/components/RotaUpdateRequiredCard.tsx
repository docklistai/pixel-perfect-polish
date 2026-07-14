import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import { useRotaOperationalIssues } from "../hooks/useRotaOperationalIssues";

function dateRange(startDate: string, endDate: string): string {
  const format = (date: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date + "T12:00:00Z"));
  return startDate === endDate ? format(startDate) : format(startDate) + " – " + format(endDate);
}

export function RotaUpdateRequiredCard({ rotaWeekId }: { rotaWeekId: string | null }) {
  const state = useRotaOperationalIssues(rotaWeekId);
  if (!state.enabled || (!state.isLoading && !state.isError && state.issues.length === 0)) {
    return null;
  }
  return (
    <Card className="border-warning/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <RefreshCw className="size-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Rota update required</span>
        <StatusBadge tone="warning">{state.issues.length || "Checking"}</StatusBadge>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        Leave changed after this week was published. Review the affected assignment, update the
        draft if needed, then explicitly republish. This issue stays open until publication.
      </p>
      {state.isLoading && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading issue…
        </p>
      )}
      {state.isError && (
        <div role="alert" className="text-xs text-danger">
          Rota update issues could not be loaded.{" "}
          <button type="button" className="font-semibold underline" onClick={state.retry}>
            Try again
          </button>
        </div>
      )}
      <ul className="space-y-2">
        {state.issues.map((issue) => (
          <li key={issue.id} className="rounded-xl border border-border px-3 py-2 text-xs">
            <div className="font-medium">{issue.staffName}</div>
            <div className="text-muted-foreground">
              {dateRange(issue.startDate, issue.endDate)} · Leave{" "}
              {issue.triggerStatus === "approved" ? "approved" : "cancelled"}
            </div>
          </li>
        ))}
      </ul>
      <Link
        to="/leave"
        className="mt-3 inline-flex rounded text-xs font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Review leave request
      </Link>
    </Card>
  );
}
