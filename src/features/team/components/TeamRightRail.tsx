import { Users, Info } from "lucide-react";
import { Card } from "@/components/dl";
import { StaffMonogram } from "@/features/staff/components/StaffMonogram";
import { toneBg } from "../types";
import { audienceKey } from "../lib/teamPresentation";
import { eventIcon, trainingIcon, trainingTone } from "../lib/teamVisuals";
import { formatBirthday, formatDateTime, relativeDays } from "../lib/teamFormatting";
import type { TeamAudience, TeamBirthday, TeamStaffEvent, TeamTrainingReminder } from "../types";

interface Props {
  training: TeamTrainingReminder[];
  birthdays: TeamBirthday[];
  events: TeamStaffEvent[];
  audiences: TeamAudience[];
  onSelectBirthday: (birthday: TeamBirthday) => void;
  onSelectTraining: (reminder: TeamTrainingReminder) => void;
  onComposeForAudience: (key: string) => void;
}

function RailEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

export function TeamRightRail({
  training,
  birthdays,
  events,
  audiences,
  onSelectBirthday,
  onSelectTraining,
  onComposeForAudience,
}: Props) {
  const EventIcon = eventIcon();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Training reminders</h3>
        {training.length === 0 ? (
          <RailEmpty>No training reminders are set up yet.</RailEmpty>
        ) : (
          training.map((item) => {
            const Icon = trainingIcon(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTraining(item)}
                className="flex w-full items-center gap-3 py-2 border-t first:border-t-0 border-border text-left hover:bg-muted/40 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[trainingTone(item)]}`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(item.dueAt)}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">
                  {relativeDays(item.dueAt)}
                </div>
              </button>
            );
          })
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Birthday reminders</h3>
        {birthdays.length === 0 ? (
          <RailEmpty>
            No birthdays are recorded. Add a birthday on a staff member to see it here.
          </RailEmpty>
        ) : (
          <div className="space-y-0.5">
            {birthdays.map((person) => (
              <button
                key={person.staffMemberId}
                type="button"
                onClick={() => onSelectBirthday(person)}
                className="flex w-full items-center gap-3 py-2 border-t first:border-t-0 border-border text-left hover:bg-muted/40 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <StaffMonogram name={person.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{person.name}</div>
                </div>
                <div className="text-[11px] text-muted-foreground shrink-0">
                  {formatBirthday(person.birthDay, person.birthMonth)}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5">
          <Info className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[11px] text-muted-foreground">
            Manager reminders only · nothing shared automatically
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Staff events</h3>
        {events.length === 0 ? (
          <RailEmpty>No upcoming staff events.</RailEmpty>
        ) : (
          events.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
            >
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg.info}`}
                aria-hidden
              >
                <EventIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDateTime(item.occursAt)}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground shrink-0">
                {relativeDays(item.occursAt)}
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">Quick groups</h3>
        {audiences.length === 0 ? (
          <RailEmpty>No audiences yet. Add staff to build your groups.</RailEmpty>
        ) : (
          audiences.map((audience) => (
            <button
              key={audienceKey(audience)}
              type="button"
              onClick={() => onComposeForAudience(audienceKey(audience))}
              className="flex w-full items-center gap-3 py-2 border-t first:border-t-0 border-border text-left hover:bg-muted/40 transition-colors px-2 -mx-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </div>
              <div className="flex-1 text-sm truncate">{audience.label}</div>
              <div className="text-[11px] text-muted-foreground shrink-0">
                {audience.memberCount} {audience.memberCount === 1 ? "member" : "members"}
              </div>
            </button>
          ))
        )}
      </Card>
    </div>
  );
}
