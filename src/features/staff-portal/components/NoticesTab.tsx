import * as React from "react";
import { Megaphone, Pin } from "lucide-react";
import { ActionButton, DashboardCard, EmptyState, StatusBadge } from "@/components/dl";
import { mockNotices } from "../data/mockPortalData";
import type { PortalNotice } from "../types";

export function NoticesTab() {
  const [notices, setNotices] = React.useState<PortalNotice[]>(mockNotices);

  const acknowledge = (id: string) => {
    setNotices((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, acknowledged: true, needsAck: false, unread: false } : n,
      ),
    );
  };

  const sorted = [...notices].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Notices</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Updates and announcements from your manager.
        </p>
      </div>

      {sorted.length === 0 ? (
        <DashboardCard className="p-6">
          <EmptyState
            icon={Megaphone}
            title="No notices yet"
            description="When your manager posts an update it will appear here."
          />
        </DashboardCard>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id}>
              <DashboardCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.pinned && (
                        <StatusBadge tone="brand">
                          <Pin className="h-3 w-3" /> Pinned
                        </StatusBadge>
                      )}
                      {n.unread && <StatusBadge tone="info">Unread</StatusBadge>}
                      {n.needsAck ? (
                        <StatusBadge tone="warning">Needs acknowledgement</StatusBadge>
                      ) : n.acknowledged ? (
                        <StatusBadge tone="success">Acknowledged</StatusBadge>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm font-semibold">{n.title}</div>
                    <div className="mt-1 text-xs text-foreground">{n.body}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {n.postedBy} · {n.postedAt}
                    </div>
                  </div>
                </div>
                {n.needsAck && (
                  <div className="mt-3">
                    <ActionButton size="sm" variant="outline" onClick={() => acknowledge(n.id)}>
                      Acknowledge
                    </ActionButton>
                  </div>
                )}
              </DashboardCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
