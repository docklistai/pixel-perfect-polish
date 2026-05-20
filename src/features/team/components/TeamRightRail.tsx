import { Users } from "lucide-react";
import { Card } from "@/components/dl";
import { toneBg } from "../types";
import type { TeamTrainingItem, TeamBirthdayItem, TeamEventItem, TeamGroup } from "../types";

interface Props {
  training: TeamTrainingItem[];
  birthdays: TeamBirthdayItem[];
  events: TeamEventItem[];
  groups: TeamGroup[];
}

export function TeamRightRail({ training, birthdays, events, groups }: Props) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Upcoming training</h3>
        {training.map((item) => (
          <div
            key={item.t}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
          >
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[item.tone]}`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.t}</div>
              <div className="text-[11px] text-muted-foreground">{item.d}</div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">{item.w}</div>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Birthdays this week</h3>
        {birthdays.map((person) => (
          <div
            key={person.n}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
          >
            <img
              src={`https://i.pravatar.cc/64?img=${person.img}`}
              className="h-8 w-8 rounded-full object-cover shrink-0"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{person.n}</div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">{person.d}</div>
          </div>
        ))}
        <p className="mt-3 text-[11px] text-muted-foreground">
          🎂 Birthday reminder — post a notice via Compose announcement.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Staff events</h3>
        {events.map((item) => (
          <div
            key={item.t}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
          >
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[item.tone]}`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.t}</div>
              <div className="text-[11px] text-muted-foreground">{item.d}</div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0">{item.w}</div>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Quick groups</h3>
        {groups.map(({ label, members }) => (
          <div
            key={label}
            className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
          >
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1 text-sm">{label}</div>
            <div className="text-[11px] text-muted-foreground shrink-0">{members}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
