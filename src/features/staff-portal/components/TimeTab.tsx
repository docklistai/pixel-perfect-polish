import * as React from "react";
import { AlertTriangle, Clock, Coffee, MapPin, PlayCircle, StopCircle } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
} from "@/components/dl";
import { mockClockEntries } from "../data/mockPortalData";
import { portalPublishedNextShift } from "../data/publishedRotaPortalData";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";

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
  const currentShift = portalPublishedNextShift;
  const currentMinutes = 16 * 60;
  const startMinutes = currentShift
    ? Number(currentShift.start.slice(0, 2)) * 60 + Number(currentShift.start.slice(3))
    : 0;
  const endMinutes = currentShift
    ? Number(currentShift.end.slice(0, 2)) * 60 + Number(currentShift.end.slice(3))
    : 0;
  const clockInAvailable =
    currentShift?.date === DEMO_WORLD.todayIso &&
    currentMinutes >= startMinutes &&
    currentMinutes < endMinutes;
  const sinceLabel = startedAt
    ? new Date(startedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;
  const entries = mockClockEntries;
  const hasMissing = entries.some((e) => e.flag === "missing-clock-out");

  const onToggle = () => {
    if (!currentShift || (!clockInAvailable && !clockedIn)) return;
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
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            NEXT PUBLISHED SHIFT
          </div>
          <StatusBadge tone={clockedIn ? "success" : "muted"}>
            {clockedIn ? "Clocked in" : "Not active"}
          </StatusBadge>
        </div>
        {currentShift ? (
          <>
            <div className="mt-2 text-[13px] text-muted-foreground">{currentShift.dayLabel}</div>
            <div className="mt-1 text-[28px] font-bold tracking-tight leading-none">
              {currentShift.start} – {currentShift.end}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" /> {currentShift.role}
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {currentShift.station}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">No published rota yet.</div>
        )}
      </DashboardCard>

      <DashboardCard className="p-5">
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            {clockedIn ? "YOU ARE CLOCKED IN" : "NOT ON SHIFT"}
          </div>
          <div className="mt-3 flex items-center justify-center">
            <button
              type="button"
              onClick={onToggle}
              disabled={!clockInAvailable && !clockedIn}
              className={`relative flex h-[220px] w-[220px] items-center justify-center rounded-full border-0 text-white shadow-[0_18px_44px_rgba(14,165,162,.42)] ${
                clockedIn
                  ? "bg-[linear-gradient(135deg,#0EA5A2_0%,#0B7A78_100%)]"
                  : "bg-[linear-gradient(135deg,#0B7A78_0%,#0EA5A2_100%)]"
              }`}
            >
              <span className="absolute inset-[-12px] rounded-full bg-[radial-gradient(circle,_rgba(14,165,162,.18),_transparent_70%)]" />
              <span className="relative flex flex-col items-center gap-2">
                {clockedIn ? (
                  <StopCircle className="h-9 w-9" />
                ) : (
                  <PlayCircle className="h-9 w-9" />
                )}
                <span className="text-[22px] font-bold leading-none">
                  {!currentShift
                    ? "No shift"
                    : clockedIn
                      ? "Clock out"
                      : clockInAvailable
                        ? "Clock in"
                        : "Not available"}
                </span>
                <span className="text-[11px] font-medium text-white/85">
                  {clockedIn
                    ? sinceLabel
                      ? `since ${sinceLabel}`
                      : "End your shift"
                    : clockInAvailable
                      ? "Tap to start your shift"
                      : "Available during your active shift"}
                </span>
              </span>
            </button>
          </div>
          <div className="mt-4 w-full rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Worked</span>
              <span>{clockedIn ? formatElapsed(elapsed) : "00:00:00"}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-border/70">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: clockedIn
                    ? `${Math.min((elapsed / (8 * 60 * 60 * 1000)) * 100, 100)}%`
                    : "0%",
                }}
              />
            </div>
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
        </div>
      </DashboardCard>

      <DashboardCard className="p-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Scheduled
            </div>
            <div className="mt-2 text-[28px] font-bold tabular-nums leading-none">
              {currentShift ? `${currentShift.hours}h` : "0h"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Shift length</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Worked
            </div>
            <div className="mt-2 text-[28px] font-bold tabular-nums leading-none">
              {clockedIn ? formatElapsed(elapsed).slice(0, 5) : "0h 00m"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">This session</div>
          </div>
        </div>
      </DashboardCard>

      {hasMissing && (
        <FeedbackBanner
          tone="warning"
          title="Missing clock-out on Wed 3 Jun"
          description="Please add the missing clock-out so your hours are accurate."
        />
      )}

      <div>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground px-1 mb-2 uppercase">
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
