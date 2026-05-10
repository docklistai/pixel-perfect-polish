import * as React from "react";
import { AlertTriangle, Clock, Coffee, PlayCircle, StopCircle } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
} from "@/components/dl";
import { mockClockEntries, mockNextShift } from "../data/mockPortalData";

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function TimeTab() {
  const [clockedIn, setClockedIn] = React.useState(false);
  const [onBreak, setOnBreak] = React.useState(false);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!clockedIn) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [clockedIn]);

  const elapsed = clockedIn && startedAt ? now - startedAt : 0;
  const sinceLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;
  const entries = mockClockEntries;
  const hasMissing = entries.some((e) => e.flag === "missing-clock-out");

  const onToggle = () => {
    if (clockedIn) {
      setClockedIn(false);
      setOnBreak(false);
      setStartedAt(null);
    } else {
      setClockedIn(true);
      setStartedAt(Date.now());
    }
  };

  return (
    <div className="space-y-4">
      {/* Current shift summary */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            CURRENT SHIFT
          </div>
          <StatusBadge tone={clockedIn ? "success" : "muted"}>
            {clockedIn ? "Scheduled" : "Off shift"}
          </StatusBadge>
        </div>
        <div className="mt-2 text-xl font-bold tracking-tight">
          {mockNextShift.start} – {mockNextShift.end}
        </div>
        <div className="text-xs text-muted-foreground">{mockNextShift.station}</div>
      </DashboardCard>

      {/* Big timer ring */}
      <DashboardCard className="p-6">
        <div className="flex flex-col items-center">
          <ClockRing active={clockedIn} elapsedMs={elapsed} />
          <div className="mt-3 text-xs text-muted-foreground">
            {clockedIn && sinceLabel
              ? `since ${sinceLabel}`
              : "Tap clock in to start your shift"}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {clockedIn && (
            <ActionButton
              variant="secondary"
              icon={Coffee}
              onClick={() => setOnBreak((b) => !b)}
              className="w-full justify-center"
            >
              {onBreak ? "End break" : "Start break"}
            </ActionButton>
          )}
          <ActionButton
            onClick={onToggle}
            icon={clockedIn ? StopCircle : PlayCircle}
            variant={clockedIn ? "danger" : "primary"}
            className="w-full justify-center"
          >
            {clockedIn ? "Clock out" : "Clock in"}
          </ActionButton>
        </div>
      </DashboardCard>

      {/* Scheduled vs worked summary */}
      <DashboardCard className="p-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              SCHEDULED
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {mockNextShift.hours}h 00m
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              WORKED
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">
              {clockedIn ? formatElapsed(elapsed).slice(0, 5) : "0h 00m"}
            </div>
          </div>
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

function ClockRing({ active, elapsedMs }: { active: boolean; elapsedMs: number }) {
  // Visual ring — fills proportionally to a notional 8-hour shift, capped at 1.
  const target = 8 * 60 * 60 * 1000;
  const pct = active ? Math.min(elapsedMs / target, 1) : 0;
  const size = 200;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {active ? (
          <>
            <div className="text-[10px] tracking-widest text-muted-foreground">
              YOU ARE CLOCKED IN
            </div>
            <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {formatElapsed(elapsedMs)}
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] tracking-widest text-muted-foreground">NOT ON SHIFT</div>
            <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-muted-foreground">
              00:00:00
            </div>
          </>
        )}
      </div>
    </div>
  );
}
