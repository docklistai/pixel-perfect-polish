import * as React from "react";
import { Clock, AlertTriangle, PlayCircle, StopCircle } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
} from "@/components/dl";
import { mockClockEntries, mockNextShift } from "../data/mockPortalData";

export function ClockTab() {
  const [clockedIn, setClockedIn] = React.useState(false);
  const [since, setSince] = React.useState<string | null>(null);
  const entries = mockClockEntries;
  const hasMissing = entries.some((e) => e.flag === "missing-clock-out");

  const onToggle = () => {
    if (clockedIn) {
      setClockedIn(false);
      setSince(null);
    } else {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setClockedIn(true);
      setSince(`${hh}:${mm}`);
    }
  };

  return (
    <div className="space-y-4">
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              TIME CLOCK
            </div>
            <div className="mt-1 text-base font-semibold">
              {clockedIn ? `Clocked in at ${since}` : "Not clocked in"}
            </div>
            <div className="text-xs text-muted-foreground">
              {clockedIn
                ? "Tap to clock out at the end of your shift."
                : "Tap to start your shift."}
            </div>
          </div>
          <StatusBadge tone={clockedIn ? "success" : "muted"} dot>
            {clockedIn ? "On shift" : "Off shift"}
          </StatusBadge>
        </div>
        <div className="mt-4">
          <ActionButton
            onClick={onToggle}
            icon={clockedIn ? StopCircle : PlayCircle}
            variant={clockedIn ? "danger" : "primary"}
            className="w-full md:w-auto"
          >
            {clockedIn ? "Clock out" : "Clock in"}
          </ActionButton>
        </div>
      </DashboardCard>

      <DashboardCard className="p-5">
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          CURRENT SHIFT
        </div>
        <div className="mt-2 text-sm font-semibold">{mockNextShift.dayLabel}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">
          {mockNextShift.start} – {mockNextShift.end} · {mockNextShift.station}
        </div>
      </DashboardCard>

      {hasMissing && (
        <FeedbackBanner
          tone="warning"
          title="Missing clock-out on Wed 6 May"
          description="Please add the missing clock-out so your hours are accurate."
        />
      )}

      <div>
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
          RECENT ENTRIES
        </div>
        {entries.length === 0 ? (
          <DashboardCard className="p-6">
            <EmptyState
              icon={Clock}
              title="No recent clock entries"
              description="Your clock-ins and clock-outs will appear here."
            />
          </DashboardCard>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id}>
                <DashboardCard className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{e.dayLabel}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {e.clockIn} – {e.clockOut ?? "—"}
                        {e.breakMinutes > 0 ? ` · ${e.breakMinutes}m break` : ""}
                      </div>
                    </div>
                    {e.flag === "missing-clock-out" ? (
                      <StatusBadge tone="warning">
                        <AlertTriangle className="h-3 w-3" />
                        Missing out
                      </StatusBadge>
                    ) : (
                      <div className="text-sm font-semibold">{e.totalHours?.toFixed(1)}h</div>
                    )}
                  </div>
                </DashboardCard>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
