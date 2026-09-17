import * as React from "react";
import { CalendarOff, ChevronRight, Plane } from "lucide-react";
import { DashboardCard } from "@/components/dl";
import { cn } from "@/lib/utils";
import { isOvernightLocal } from "@/features/rota/lib/scheduling/calendarInterval";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { usePortalRota } from "../hooks/usePortalRota";
import { usePortalLeaveRequests } from "../hooks/usePortalLeaveRequests";
import { usePortalTimezone } from "../hooks/usePortalTimezone";
import { portalNowInTimezone, DEMO_NOW } from "../lib/portalNow";
import { buildPortalThisWeekShape, type PortalThisWeekDay } from "../lib/portalThisWeek";
import type { PortalShift, PortalTab } from "../types";

export interface PortalThisWeekCardProps {
  onNavigate: (tab: PortalTab) => void;
  onSelectShift?: (shift: PortalShift) => void;
}

export function PortalThisWeekCard({ onNavigate, onSelectShift }: PortalThisWeekCardProps) {
  const rota = usePortalRota();
  const timezone = usePortalTimezone();
  const { isLive, requestHistory } = usePortalLeaveRequests();
  const demoLeaveRequests = useWorkspaceSelector((state) => state.leaveRequests);

  const todayIso = timezone ? portalNowInTimezone(timezone).todayIso : DEMO_NOW.todayIso;

  // Resolve approved leave across live and demo modes
  const leaveList = React.useMemo(() => {
    if (isLive) {
      return requestHistory.map((r) => ({
        startIso: r.startIso,
        endIso: r.endIso,
        type: r.type,
        status: r.status,
      }));
    }
    return demoLeaveRequests
      .filter((r) => r.staffId === "olivia-bennett")
      .map((r) => ({
        startIso: r.startIso,
        endIso: r.endIso,
        type: r.type,
        state: r.state,
      }));
  }, [isLive, requestHistory, demoLeaveRequests]);

  const shape = React.useMemo(() => {
    return buildPortalThisWeekShape({
      hasPublished: rota.hasPublished,
      weekDays: rota.weekDays,
      shifts: [...rota.upcoming, ...rota.history],
      leaveRequests: leaveList,
      todayIso,
      weekLabel: rota.weekLabel,
    });
  }, [
    rota.hasPublished,
    rota.weekDays,
    rota.upcoming,
    rota.history,
    leaveList,
    todayIso,
    rota.weekLabel,
  ]);

  if (!shape.hasPublished) {
    return (
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            This week
          </div>
          <button
            type="button"
            onClick={() => onNavigate("shifts")}
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            View rota
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 p-5 text-center bg-muted/20">
          <CalendarOff className="mx-auto h-7 w-7 text-muted-foreground/60 mb-2" />
          <div className="text-sm font-semibold">No published rota for this week</div>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
            Your shifts and days off will appear here once your manager publishes this week's rota.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            This week
          </div>
          {shape.weekLabel && (
            <div className="text-xs text-muted-foreground mt-0.5">{shape.weekLabel}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onNavigate("shifts")}
          className="text-[11px] font-semibold text-brand hover:underline"
        >
          View rota
        </button>
      </div>

      <div className="mt-3 divide-y divide-border/60" role="list" aria-label="This week's schedule">
        {shape.days.map((day) => (
          <DayRow key={day.iso} day={day} onSelectShift={onSelectShift} />
        ))}
      </div>
    </DashboardCard>
  );
}

function DayRow({
  day,
  onSelectShift,
}: {
  day: PortalThisWeekDay;
  onSelectShift?: (shift: PortalShift) => void;
}) {
  const hasShift = day.shifts.length > 0;
  const isInteractive = hasShift && Boolean(onSelectShift);

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 px-2 rounded-xl transition-colors",
        day.isToday && "bg-brand-soft/40 font-medium",
        isInteractive && "hover:bg-muted/50 cursor-pointer",
      )}
      onClick={() => {
        if (isInteractive && day.primaryShift) {
          onSelectShift?.(day.primaryShift);
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ") && day.primaryShift) {
          e.preventDefault();
          onSelectShift?.(day.primaryShift);
        }
      }}
      aria-label={
        day.isToday
          ? `Today, ${day.weekdayName} ${day.dayNum}: ${hasShift ? `${day.primaryShift?.start} to ${day.primaryShift?.end}` : day.leaveContext ? day.leaveContext.type : "Off"}`
          : undefined
      }
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Day column */}
        <div className="w-14 shrink-0">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                day.isToday ? "text-brand" : "text-muted-foreground",
              )}
            >
              {day.weekdayName}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                day.isToday ? "font-bold text-brand" : "text-foreground",
              )}
            >
              {day.dayNum}
            </span>
          </div>
          {day.isToday && (
            <span className="text-[10px] font-semibold text-brand block leading-tight">Today</span>
          )}
        </div>

        {/* Schedule column */}
        <div className="min-w-0 flex-1">
          {hasShift ? (
            <div className="space-y-1">
              {day.shifts.map((shift) => {
                const overnight = isOvernightLocal(shift.start, shift.end);
                return (
                  <div key={shift.id} className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground leading-snug">
                        {shift.start} – {shift.end}
                      </span>
                      {overnight && (
                        <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          +1 next day
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {shift.role} · {shift.station}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : day.leaveContext ? (
            <div className="flex items-center gap-1.5 text-xs text-brand font-medium">
              <Plane className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{day.leaveContext.type} (Approved)</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Off</span>
          )}
        </div>
      </div>

      {isInteractive && (
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2 opacity-60" />
      )}
    </div>
  );
}
