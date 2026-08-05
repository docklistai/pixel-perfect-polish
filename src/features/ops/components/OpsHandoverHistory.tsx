import * as React from "react";
import { StatusBadge } from "@/components/dl";
import type { OpsHandover } from "../types";
import { recipientForActor } from "../lib/opsRecipients";

export function OpsHandoverHistory(props: {
  handovers: OpsHandover[];
  actorMembershipId: string;
  selectedHandoverId?: string | null;
  onAcknowledge: (id: string) => Promise<boolean>;
}) {
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    if (!props.selectedHandoverId) return;
    document
      .getElementById(`ops-handover-${props.selectedHandoverId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [props.selectedHandoverId]);
  const handovers = props.handovers.filter(
    (handover) =>
      !search.trim() ||
      `${handover.notes} ${handover.senderName} ${handover.locationName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Retained handover history
        </h3>
        <input
          aria-label="Search handover history"
          type="search"
          className="input ml-auto max-w-56"
          value={search}
          placeholder="Search history"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {handovers.map((handover) => {
          const mine = recipientForActor(handover.recipients, props.actorMembershipId);
          const acknowledged = handover.recipients.filter((item) => item.acknowledgedAt).length;
          return (
            <article
              key={handover.id}
              id={`ops-handover-${handover.id}`}
              className={`rounded-lg border p-3 ${handover.id === props.selectedHandoverId ? "border-brand bg-brand-soft/30" : "border-border"}`}
            >
              <div className="flex items-center gap-2">
                <strong className="text-xs">
                  {handover.locationName} · {handover.senderName} · {handover.handoverDate}
                </strong>
                <StatusBadge
                  tone={acknowledged === handover.recipients.length ? "success" : "warning"}
                >
                  {acknowledged}/{handover.recipients.length} ack
                </StatusBadge>
                {mine && !mine.acknowledgedAt && (
                  <button
                    type="button"
                    className="link ml-auto text-xs"
                    onClick={() => props.onAcknowledge(handover.id)}
                  >
                    Acknowledge
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                {handover.notes}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {handover.items.length} item{handover.items.length === 1 ? "" : "s"} ·{" "}
                {handover.items.filter((item) => item.carriedForward).length} carried forward
              </p>
            </article>
          );
        })}
        {handovers.length === 0 && (
          <p className="text-xs text-muted-foreground">No matching handovers.</p>
        )}
      </div>
    </div>
  );
}
