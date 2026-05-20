import * as React from "react";
import { Pin, MoreHorizontal, Users, Shield } from "lucide-react";
import { Card, EmptyState } from "@/components/dl";
import { toneBg } from "../types";
import { audienceOptions } from "../data/teamDemoData";
import type { TeamAnnouncement, TabKey } from "../types";

interface Props {
  announcements: TeamAnnouncement[];
  onSelect: (a: TeamAnnouncement) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "all", label: "All announcements" },
  { key: "pinned", label: "Pinned" },
  { key: "myAck", label: "My acknowledgements" },
];

export function TeamAnnouncementList({ announcements, onSelect }: Props) {
  const [tab, setTab] = React.useState<TabKey>("all");
  const [audience, setAudience] = React.useState("All audiences");

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
    <Card className="rounded-2xl">
      <div className="flex items-center justify-between px-5 pt-4">
        <div role="tablist" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`pb-3 border-b-2 transition-colors ${
                tab === key
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-3">
          <label htmlFor="team-audience-filter" className="sr-only">
            Filter by audience
          </label>
          <div className="relative flex items-center">
            <Users className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <select
              id="team-audience-filter"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {audienceOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
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
              className="block w-full text-left border-b border-border/60 last:border-0 px-5 py-4 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition"
            >
              {a.pinned && (
                <div className="inline-flex items-center gap-1 rounded-full bg-accent-purple-soft text-accent-purple text-[11px] font-medium px-2 py-0.5 mb-2">
                  <Pin className="h-3 w-3" aria-hidden="true" /> Pinned
                </div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${toneBg[a.tone]}`}
                >
                  <a.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    {a.t} <span aria-hidden="true">{a.emoji}</span>
                    {a.id === "food-safety" && (
                      <Shield className="h-4 w-4 text-success" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {a.tags.map((tg) => (
                      <span
                        key={tg}
                        className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-xs shrink-0 min-w-[72px]">
                  <div className="font-semibold">
                    {a.ackDone} / {a.ackTotal}
                  </div>
                  <div className="text-muted-foreground">Acknowledged</div>
                  <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${(a.ackDone / a.ackTotal) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    Published
                    <br />
                    <span className="text-foreground font-medium">{a.date}</span>
                  </div>
                </div>
                <MoreHorizontal
                  className="h-4 w-4 text-muted-foreground shrink-0 mt-1"
                  aria-hidden="true"
                />
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
