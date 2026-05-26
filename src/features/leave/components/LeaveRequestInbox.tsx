import * as React from "react";
import { StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "../types";

type Tab = "needs" | "approved" | "declined" | "all";

interface Props {
  requests: LeaveRequest[];
  approved: Set<string>;
  declined: Set<string>;
  activeId: string;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onSelect: (id: string) => void;
}

const tabs: Array<{ key: Tab; label: string; tone?: "warning" | "success" | "danger" }> = [
  { key: "needs", label: "Needs review", tone: "warning" },
  { key: "approved", label: "Approved", tone: "success" },
  { key: "declined", label: "Declined", tone: "danger" },
  { key: "all", label: "All" },
];

export function LeaveRequestInbox({
  requests,
  approved,
  declined,
  activeId,
  onApprove,
  onDecline,
  onSelect,
}: Props) {
  const [tab, setTab] = React.useState<Tab>("needs");

  const counts = React.useMemo(() => {
    let needs = 0;
    let app = 0;
    let dec = 0;
    for (const r of requests) {
      if (approved.has(r.id)) app += 1;
      else if (declined.has(r.id)) dec += 1;
      else needs += 1;
    }
    return { needs, approved: app, declined: dec, all: requests.length };
  }, [requests, approved, declined]);

  const visible = React.useMemo(() => {
    return requests.filter((r) => {
      if (tab === "approved") return approved.has(r.id);
      if (tab === "declined") return declined.has(r.id);
      if (tab === "needs") return !approved.has(r.id) && !declined.has(r.id);
      return true;
    });
  }, [requests, tab, approved, declined]);

  return (
    <div className="col-span-12 lg:col-span-7 card overflow-hidden">
      <div className="card-section">
        <div className="section-label mb-2">Leave request inbox</div>
        <div className="dl-tabs flex-wrap" style={{ borderBottom: "none" }}>
          {tabs.map((t) => {
            const count = counts[t.key];
            return (
              <button
                key={t.key}
                type="button"
                className={cn("dl-tab", tab === t.key && "active")}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {count > 0 && (
                  <StatusBadge tone={t.tone ?? "muted"} className="ml-1">
                    {count}
                  </StatusBadge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {visible.length === 0 ? (
          <div className="empty">
            <div className="ill" aria-hidden>
              <span className="text-xl">🛫</span>
            </div>
            <h4>Nothing in this list</h4>
            <p>You&apos;re all caught up on this view.</p>
          </div>
        ) : (
          visible.map((r) => {
            const isApproved = approved.has(r.id);
            const isDeclined = declined.has(r.id);
            const isActive = activeId === r.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  isActive ? "border-brand bg-brand-soft" : "border-border",
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 text-left"
                  aria-pressed={isActive}
                  onClick={() => onSelect(r.id)}
                >
                  <img
                    src={`https://i.pravatar.cc/64?img=${r.img}`}
                    className="h-8 w-8 rounded-full object-cover"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.n}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.role}</div>
                  </div>
                </button>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <div>
                    <div className="font-medium">{r.date}</div>
                    <div className="text-muted-foreground">{r.dur}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Rota impact</div>
                    <StatusBadge
                      tone={
                        r.tone === "danger"
                          ? "danger"
                          : r.tone === "warning"
                            ? "warning"
                            : "success"
                      }
                      dot
                    >
                      {r.impact}
                    </StatusBadge>
                  </div>
                </div>
                {!isApproved && !isDeclined ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      aria-label={`Decline leave request for ${r.n}`}
                      className="btn secondary sm flex-1 justify-center"
                      onClick={() => onDecline(r.id)}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      aria-label={`Approve leave request for ${r.n}`}
                      className="btn primary sm flex-1 justify-center"
                      onClick={() => onApprove(r.id)}
                    >
                      Approve
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <StatusBadge
                      tone={isApproved ? "success" : "muted"}
                      className="w-full justify-center"
                    >
                      {isApproved ? "Approved" : "Declined"}
                    </StatusBadge>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="card-foot flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {visible.length} of {requests.length}
        </span>
        <div className="flex-1" />
        <button type="button" className="btn ghost sm" onClick={() => setTab("needs")}>
          Reset
        </button>
      </div>
    </div>
  );
}
