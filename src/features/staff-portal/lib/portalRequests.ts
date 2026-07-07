import type { PortalLeaveRequest } from "../api/portalLiveData";
import type { PortalRequest } from "../types";

/** Maps a live leave request row into the shared portal request shape. */
export function toPortalRequest(request: PortalLeaveRequest): PortalRequest {
  return {
    id: request.id,
    kind: "time-off",
    title: `${request.type} · ${request.date}`,
    detail: request.reason,
    submitted: request.submittedAt,
    status: request.status,
    managerResponse: request.decisionReason,
  };
}
