import * as React from "react";
import { AlertTriangle, Clock, Coffee, MapPin, PlayCircle, StopCircle } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  EmptyState,
  FeedbackBanner,
  StatusBadge,
} from "@/components/dl";
import { usePortalRota } from "../hooks/usePortalRota";
import { usePortalClock } from "../hooks/usePortalClock";
import { formatPortalElapsed } from "../lib/portalElapsed";
import { PortalRotaReadState } from "./PortalRotaReadState";

export function TimeTab() {
  const clock = usePortalClock();
  const { clockedIn, onBreak, startedAtMs, sinceLabel, entries, clockIn, clockOut, toggleBreak } =
    clock;
  const rota = usePortalRota();
  const { nextShift, activeShift } = rota;
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!clockedIn) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [clockedIn]);

  // The persisted server timestamp can arrive a few milliseconds after the
  // click-time `now` state. Clamp that brief skew so the first live render
  // never presents a negative timer while the one-second ticker catches up.
  const elapsed = clockedIn && startedAtMs ? Math.max(0, now - startedAtMs) : 0;
  // Clock in only against today's active shift; otherwise show the next one.
  const displayShift = activeShift ?? nextShift;
  const rotaUnavailable = rota.isLoading || rota.isError;
  const clockInAvailable = !rotaUnavailable && activeShift !== null;
  const missingEntry = entries.find((e) => e.flag === "missing-clock-out");

  const onToggle = () => {
    if (clockedIn) {
      clockOut();
      setNow(Date.now());
    } else if (clockInAvailable) {
      clockIn();
      setNow(Date.now());
    }
  };

  return (
    <div className="space-y-4">
      {rotaUnavailable && (
        <PortalRotaReadState
          isLoading={rota.isLoading}
          isError={rota.isError}
          onRetry={rota.retry}
        />
      )}
      {clock.isLoading && (
        <div role="status" className="text-sm text-muted-foreground">
          Loading your clock…
        </div>
      )}
      {clock.isError && (
        <FeedbackBanner
          tone="warning"
          title="Your clock is unavailable"
          description="Try again before clocking in or changing a break."
          action={
            <ActionButton variant="secondary" size="sm" onClick={clock.retry}>
              Try again
            </ActionButton>
          }
        />
      )}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            {activeShift ? "CURRENT SHIFT" : "NEXT PUBLISHED SHIFT"}
          </div>
          <StatusBadge tone={clockedIn ? "success" : "muted"}>
            {clockedIn ? "Clocked in" : "Not active"}
          </StatusBadge>
        </div>
        {displayShift ? (
          <>
            <div className="mt-2 text-[13px] text-muted-foreground">{displayShift.dayLabel}</div>
            <div className="mt-1 text-[28px] font-bold tracking-tight leading-none">
              {displayShift.start} – {displayShift.end}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" /> {displayShift.role}
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {displayShift.station}
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
            {clockedIn ? "YOU ARE CLOCKED IN" : clockInAvailable ? "ON SHIFT NOW" : "NOT ON SHIFT"}
          </div>
          <div className="mt-3 flex items-center justify-center">
            <button
              type="button"
              onClick={onToggle}
              disabled={clock.isLoading || clock.isError || (!clockInAvailable && !clockedIn)}
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
                  {!displayShift
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
              <span>{clockedIn ? formatPortalElapsed(elapsed) : "00:00:00"}</span>
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
          {clockedIn && !clock.isError && (
            <ActionButton
              variant="secondary"
              icon={Coffee}
              onClick={toggleBreak}
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
              {displayShift ? `${displayShift.hours}h` : "0h"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Shift length</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Worked
            </div>
            <div className="mt-2 text-[28px] font-bold tabular-nums leading-none">
              {clockedIn ? formatPortalElapsed(elapsed).slice(0, 5) : "0h 00m"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">This session</div>
          </div>
        </div>
      </DashboardCard>

      {missingEntry && (
        <FeedbackBanner
          tone="warning"
          title={`Missing clock-out on ${missingEntry.dayLabel}`}
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
