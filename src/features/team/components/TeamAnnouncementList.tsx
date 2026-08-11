import * as React from "react";
import { Pin, Users, ChevronDown } from "lucide-react";
import { StatusBadge, EmptyState } from "@/components/dl";
import { cn } from "@/lib/utils";
import { toneBg, ALL_AUDIENCES } from "../types";
import {
  countByTab,
  filterAnnouncements,
  isAwaitingAcknowledgement,
} from "../lib/teamPresentation";
import { announcementIcon, announcementTone } from "../lib/teamVisuals";
import { formatDate } from "../lib/teamFormatting";
import type { TabKey, TeamAnnouncement, TeamAudience } from "../types";

interface Props {
  announcements: TeamAnnouncement[];
  audiences: TeamAudience[];
  onSelect: (announcement: TeamAnnouncement) => void;
  onCompose: () => void;
}

interface TabSpec {
  key: TabKey;
  label: string;
  tone?: "purple" | "warning";
}

const tabs: TabSpec[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned", tone: "purple" },
  { key: "awaitingAck", label: "Awaiting ack", tone: "warning" },
];

export function TeamAnnouncementList({ announcements, audiences, onSelect, onCompose }: Props) {
  const [tab, setTab] = React.useState<TabKey>("all");
  const [audience, setAudience] = React.useState(ALL_AUDIENCES);

  const counts = React.useMemo(() => countByTab(announcements), [announcements]);
  const visible = React.useMemo(
    () => filterAnnouncements(announcements, tab, audience),
    [announcements, tab, audience],
  );

  // Audience options come from the live read model, so the list only ever
  // offers audiences that actually exist in this workspace.
  const audienceOptions = React.useMemo(
    () => [ALL_AUDIENCES, ...audiences.map((item) => item.label)],
    [audiences],
  );

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
            onChange={(event) => setAudience(event.target.value)}
            className="dl-select appearance-none !w-auto pl-8 pr-7 !py-1.5 text-xs"
          >
            {audienceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Publish your first update and it will appear here with read and acknowledgement tracking."
            action={
              <button type="button" className="btn primary sm" onClick={onCompose}>
                Compose announcement
              </button>
            }
          />
        ) : (
          <EmptyState
            title="Nothing matches this filter"
            description="No announcements match the current tab and audience."
          />
        )
      ) : (
        visible.map((announcement) => {
          const Icon = announcementIcon(announcement);
          const readPercent =
            announcement.recipientCount === 0
              ? 0
              : (announcement.readCount / announcement.recipientCount) * 100;
          return (
            <button
              key={announcement.id}
              type="button"
              onClick={() => onSelect(announcement)}
              className="block w-full text-left border-t border-border/40 px-5 py-4 hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand transition"
            >
              {announcement.pinned && (
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
                    toneBg[announcementTone(announcement)],
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 font-semibold text-[14.5px]">
                    {announcement.title}
                    {isAwaitingAcknowledgement(announcement) && (
                      <span className="ml-auto">
                        <StatusBadge tone="warning">Awaiting ack</StatusBadge>
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {announcement.body}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="badge outline">{announcement.audienceLabel}</span>
                    {announcement.requiresAcknowledgement && (
                      <span className="badge outline">Acknowledgement asked</span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs shrink-0 min-w-[120px]">
                  <div className="font-semibold">
                    {announcement.readCount} / {announcement.recipientCount} read
                  </div>
                  <div className="text-muted-foreground">
                    {formatDate(announcement.publishedAt)}
                  </div>
                  <div className="bar mt-2 ml-auto" style={{ width: 110, height: 4 }}>
                    <i style={{ width: `${readPercent}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })
      )}

      {visible.length > 0 && (
        <div className="card-foot flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Showing {visible.length} of {announcements.length}
          </span>
        </div>
      )}
    </div>
  );
}
