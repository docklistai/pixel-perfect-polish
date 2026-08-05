import { useNavigate } from "@tanstack/react-router";
import { Clock, ExternalLink, MapPin, User } from "lucide-react";
import type { OpsEntry } from "../types";
import { formatOpsDateTime } from "../lib/opsPresentation";

export function OpsEntryContextCard({ entry }: { entry: OpsEntry }) {
  const navigate = useNavigate();
  const rotaSearch =
    entry.rotaWeekOffset !== null
      ? {
          location: entry.locationId,
          week: entry.rotaWeekOffset,
          shift: entry.shiftId ?? undefined,
        }
      : undefined;
  return (
    <div className="card space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Details
      </h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {entry.description || "No description recorded."}
      </p>
      {entry.immediateAction && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="mb-1 text-xs text-muted-foreground">Immediate action</div>
          <p className="text-sm">{entry.immediateAction}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {entry.locationName}
          {entry.area ? ` · ${entry.area}` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <User className="size-3.5" />
          {entry.createdByName}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {formatOpsDateTime(entry.createdAt)}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {rotaSearch && (
          <button
            type="button"
            className="link text-xs"
            onClick={() => navigate({ to: "/rota", search: rotaSearch })}
          >
            <ExternalLink className="mr-1 inline size-3" />
            Exact rota context
          </button>
        )}
        {entry.subjectStaffMemberId && (
          <button
            type="button"
            className="link text-xs"
            onClick={() =>
              navigate({ to: "/staff/$staffId", params: { staffId: entry.subjectStaffMemberId! } })
            }
          >
            Staff profile
          </button>
        )}
        {entry.leaveRequestId && (
          <button
            type="button"
            className="link text-xs"
            onClick={() => navigate({ to: "/leave", search: { request: entry.leaveRequestId! } })}
          >
            Leave context
          </button>
        )}
      </div>
    </div>
  );
}
