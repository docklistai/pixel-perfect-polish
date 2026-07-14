import { ActionButton, DashboardCard, StatusBadge } from "@/components/dl";
import type { PortalShiftReleasesState } from "../hooks/usePortalShiftReleases";
import { shiftReleaseStatusPresentation } from "../lib/shiftReleaseRequests";

export function ShiftReleaseHistoryItems({ releases }: { releases: PortalShiftReleasesState }) {
  if (!releases.enabled) return null;
  if (releases.isLoading) {
    return (
      <li>
        <DashboardCard className="p-4">
          <p role="status" className="text-sm text-muted-foreground">
            Loading release requests…
          </p>
        </DashboardCard>
      </li>
    );
  }
  if (releases.isError) {
    return (
      <li>
        <DashboardCard className="p-4">
          <div role="alert">
            <p className="text-sm font-medium">Release requests are unavailable</p>
            <ActionButton className="mt-2" size="sm" variant="secondary" onClick={releases.retry}>
              Try again
            </ActionButton>
          </div>
        </DashboardCard>
      </li>
    );
  }
  return releases.requests.map((request) => {
    const status = shiftReleaseStatusPresentation(request.status);
    return (
      <li key={request.requestId}>
        <DashboardCard className="rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                Shift release · {request.role} · {request.dayLabel}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {request.start} – {request.end} · {request.locationName}
              </div>
              <p className="mt-1.5 text-xs">{request.reason}</p>
              {request.decisionReason && (
                <p className="mt-1 text-xs">
                  <span className="font-medium">Manager note:</span> {request.decisionReason}
                </p>
              )}
              {status.responsibilityContinues && (
                <p className="mt-1 text-[11px] font-medium text-warning">
                  You remain responsible until the rota is republished.
                </p>
              )}
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
        </DashboardCard>
      </li>
    );
  });
}
