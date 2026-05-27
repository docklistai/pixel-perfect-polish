import * as React from "react";
import { StatusBadge } from "@/components/dl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, MessageSquare, Plane, X } from "lucide-react";
import type { LeaveRequest } from "../types";

type Tab = "needs" | "approved" | "declined" | "all";

interface Props {
  requests: LeaveRequest[];
  activeId: string;
  onAsk: (request: LeaveRequest) => void;
  onApprove: (request: LeaveRequest) => void;
  onDecline: (request: LeaveRequest) => void;
  onReopen: (id: string) => void;
  onSelect: (id: string) => void;
}

const tabs: Array<{ key: Tab; label: string; tone?: "warning" | "success" | "danger" | "muted" }> =
  [
    { key: "needs", label: "Needs review", tone: "warning" },
    { key: "approved", label: "Approved", tone: "success" },
    { key: "declined", label: "Declined", tone: "danger" },
    { key: "all", label: "All", tone: "muted" },
  ];

const avatarTones = ["av-c1", "av-c2", "av-c3", "av-c4"] as const;

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function LeaveRequestInbox({
  requests,
  activeId,
  onAsk,
  onApprove,
  onDecline,
  onReopen,
  onSelect,
}: Props) {
  const [tab, setTab] = React.useState<Tab>("needs");

  const counts = React.useMemo(() => {
    let pending = 0;
    let approved = 0;
    let declined = 0;
    for (const r of requests) {
      if (r.state === "approved") approved += 1;
      else if (r.state === "declined") declined += 1;
      else pending += 1;
    }
    return { needs: pending, approved, declined, all: requests.length };
  }, [requests]);

  const visible = React.useMemo(() => {
    return requests.filter((r) => {
      if (tab === "approved") return r.state === "approved";
      if (tab === "declined") return r.state === "declined";
      if (tab === "needs") return r.state === "pending";
      return true;
    });
  }, [requests, tab]);

  return (
    <div className="col-span-12 lg:col-span-7 card overflow-hidden">
      <div className="card-section row gap-3" style={{ padding: "10px 18px" }}>
        <div className="dl-tabs flex-wrap grow" style={{ borderBottom: "none" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={cn("dl-tab", tab === t.key && "active")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <StatusBadge tone={t.tone ?? "muted"}>{counts[t.key]}</StatusBadge>
              )}
            </button>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="btn ghost sm">
              Sort: Newest <ChevronDown className="h-3 w-3" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuItem>
              <Check className="h-3.5 w-3.5" aria-hidden /> Newest first
            </DropdownMenuItem>
            <DropdownMenuItem>Coverage impact</DropdownMenuItem>
            <DropdownMenuItem>Notice period</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTab("needs")}>Needs review</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <div className="ill" aria-hidden>
            <Plane className="h-5 w-5" />
          </div>
          <h4>Nothing in this list</h4>
          <p>
            {tab === "needs"
              ? "All requests are reviewed."
              : tab === "approved"
                ? "No approved requests yet."
                : "No declined requests."}
          </p>
        </div>
      ) : (
        visible.map((r, index) => {
          const isActive = activeId === r.id;
          const impactTone =
            r.tone === "danger" ? "danger" : r.tone === "warning" ? "warning" : "success";
          const avatarTone = avatarTones[index % avatarTones.length];

          return (
            <div
              key={r.id}
              className={cn(
                "border-t border-border/70 px-[18px] py-4 outline-none transition-colors",
                isActive && "bg-[var(--bg-hover)]",
              )}
            >
              <button
                type="button"
                className="block w-full text-left"
                aria-pressed={isActive}
                onClick={() => onSelect(r.id)}
              >
                <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                  <div className={cn("av", avatarTone)}>{initials(r.n)}</div>
                  <div className="grow min-w-0">
                    <div className="row gap-2 flex-wrap">
                      <span className="strong">{r.n}</span>
                      <span className="muted txt-sm">
                        · {r.role.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    <div className="muted txt-sm mt-1">{r.reason}</div>
                    <div className="row gap-2 mt-2 flex-wrap">
                      <StatusBadge tone="purple" className="shrink-0 whitespace-nowrap">
                        <Plane className="h-3 w-3" aria-hidden /> {r.type}
                      </StatusBadge>
                      <StatusBadge tone={impactTone} dot className="shrink-0 whitespace-nowrap">
                        {r.impact} impact
                      </StatusBadge>
                      <StatusBadge tone="muted" className="shrink-0 whitespace-nowrap">
                        {r.notice}d notice
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="strong mono txt-sm">{r.date}</div>
                    <div className="muted txt-xs">{r.days} days</div>
                  </div>
                </div>
              </button>

              {r.state === "pending" && (
                <div className="row gap-2 mt-3">
                  <button type="button" className="btn ghost sm" onClick={() => onAsk(r)}>
                    <MessageSquare className="h-3 w-3" aria-hidden /> Ask
                  </button>
                  <div className="grow" />
                  <button type="button" className="btn secondary sm" onClick={() => onDecline(r)}>
                    Decline
                  </button>
                  <button type="button" className="btn primary sm" onClick={() => onApprove(r)}>
                    <Check className="h-3 w-3" aria-hidden /> Approve
                  </button>
                </div>
              )}

              {r.state === "approved" && (
                <div className="row gap-2 mt-3">
                  <StatusBadge tone="success">
                    <Check className="h-3 w-3" aria-hidden /> Approved
                  </StatusBadge>
                  <div className="grow" />
                  <button type="button" className="btn ghost sm" onClick={() => onReopen(r.id)}>
                    Undo
                  </button>
                </div>
              )}

              {r.state === "declined" && (
                <div className="row gap-2 mt-3">
                  <StatusBadge tone="danger">
                    <X className="h-3 w-3" aria-hidden /> Declined
                  </StatusBadge>
                  <div className="grow" />
                  <button type="button" className="btn ghost sm" onClick={() => onReopen(r.id)}>
                    Undo
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
