import * as React from "react";
import { Pin, MoreHorizontal, Users, ChevronDown, Shield } from "lucide-react";
import { StatusBadge, EmptyState } from "@/components/dl";
import { cn } from "@/lib/utils";
import { toneBg } from "../types";
import { audienceOptions } from "../data/teamDemoData";
import type { TeamAnnouncement, TabKey } from "../types";

interface Props {
  announcements: TeamAnnouncement[];
  onSelect: (a: TeamAnnouncement) => void;
}

interface TabSpec {
  key: TabKey;
  label: string;
  tone?: "purple" | "warning";
}

const tabs: TabSpec[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned", tone: "purple" },
  { key: "myAck", label: "Need my ack", tone: "warning" },
];

export function TeamAnnouncementList({ announcements, onSelect }: Props) {
  const [tab, setTab] = React.useState<TabKey>("all");
  const [audience, setAudience] = React.useState("All audiences");

  const counts = React.useMemo(() => {
    return {
      all: announcements.length,
      pinned: announcements.filter((a) => a.pinned).length,
      myAck: announcements.filter((a) => !a.myAck).length,
    } as Record<TabKey, number>;
  }, [announcements]);

  const visible = React.useMemo(() => {
    return announcements
      .filter((a) => {
        if (tab === "pinned") return a.pinned;
        if (tab === "myAck") return !a.myAck;
        return true;
      })
      .filter((a) => audience === "All audiences" || a.audiences.includes(audience));
  }, [announcements, tab, audience]);

  return (
    <div className="card overflow-hidden">
      <div className="card-section flex flex-wrap items-center gap-3">
        <div role="tablist" className="dl-tabs flex-1 min-w-0" style={{ borderBottom: "none" }}>
          {tabs.map(({ key, label, tone }) => {
            const count = counts[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={cn("dl-tab", tab === key && "active")}
                onClick={() => setTab(key)}
              >
                {label}
                {count > 0 && (
                  <StatusBadge tone={tone ?? "muted"} className="ml-1">
                    {count}
                  </StatusBadge>
                )}
              </button>
            );
          })}
        </div>

        <label htmlFor="team-audience-filter" className="sr-only">
          Filter by audience
        </label>
        <div className="relative flex items-center">
          <Users
            className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
          <ChevronDown
            className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
          <select
            id="team-audience-filter"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="dl-select appearance-none !w-auto pl-8 pr-7 !py-1.5 text-xs"
          >
            {audienceOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="No announcements match the current filter."
        />
      ) : (
        visible.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className="block w-full text-left border-t border-border/40 px-5 py-4 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition"
          >
            {a.pinned && (
              <div className="mb-2">
                <StatusBadge tone="purple">
                  <Pin className="h-3 w-3" aria-hidden /> Pinned
                </StatusBadge>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  toneBg[a.tone],
                )}
                aria-hidden
              >
                <a.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 font-semibold text-[14.5px]">
                  {a.t} <span aria-hidden>{a.emoji}</span>
                  {a.id === "food-safety" && (
                    <Shield className="h-4 w-4 text-success" aria-hidden />
                  )}
                  {!a.myAck && (
                    <span className="ml-auto">
                      <StatusBadge tone="warning">Needs your ack</StatusBadge>
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.tags.map((tg) => (
                    <span key={tg} className="badge outline">
                      {tg}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs shrink-0 min-w-[120px]">
                <div className="font-semibold">
                  {a.ackDone} / {a.ackTotal} read
                </div>
                <div className="text-muted-foreground">{a.date}</div>
                <div className="bar mt-2 ml-auto" style={{ width: 110, height: 4 }}>
                  <i style={{ width: `${(a.ackDone / a.ackTotal) * 100}%` }} />
                </div>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
            </div>
          </button>
        ))
      )}

      {visible.length > 0 && (
        <div className="card-foot flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Showing {visible.length} of {announcements.length}
          </span>
          <div className="flex-1" />
          <button type="button" className="btn ghost sm">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
