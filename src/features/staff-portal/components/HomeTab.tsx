import { Calendar, Clock, MapPin, MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { ActionButton, DashboardCard, QuickActionCard, StatusBadge } from "@/components/dl";
import {
  mockNextShift,
  mockNotices,
  mockOpenShifts,
  mockProfile,
  mockWeeklySummary,
} from "../data/mockPortalData";
import type { PortalTab } from "../types";

export function HomeTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const todayNotice = mockNotices.find((n) => n.unread) ?? mockNotices[0];
  const openShift = mockOpenShifts[0];

  return (
    <div className="space-y-4">
      {/* Next shift hero */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            NEXT SHIFT
          </div>
          <StatusBadge tone="success">Confirmed</StatusBadge>
        </div>
        <div className="mt-2 text-[13px] text-muted-foreground">{mockNextShift.dayLabel}</div>
        <div className="mt-1 text-[28px] font-bold tracking-tight leading-none">
          {mockNextShift.start} – {mockNextShift.end}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Calendar className="h-4 w-4 text-muted-foreground" /> {mockNextShift.role}
          </span>
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <MapPin className="h-4 w-4 text-muted-foreground" /> {mockNextShift.station}
          </span>
        </div>
        {mockNextShift.note && (
          <div className="mt-3 text-xs text-muted-foreground">{mockNextShift.note}</div>
        )}
        <div className="mt-4">
          <ActionButton
            onClick={() => onNavigate("time")}
            icon={Clock}
            className="w-full justify-center"
          >
            Clock in
          </ActionButton>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("shifts")}
          className="mt-2 w-full text-center text-xs font-semibold text-brand hover:underline inline-flex items-center justify-center gap-1"
        >
          Shift notes ({mockNextShift.tasks?.length ?? 0}) <ArrowRight className="h-3 w-3" />
        </button>
      </DashboardCard>

      {/* This week summary */}
      <DashboardCard className="p-5">
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          THIS WEEK
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat value={mockWeeklySummary.shifts} label="Shifts" />
          <Stat value={mockWeeklySummary.hours} label="Hours" />
          <Stat value={mockWeeklySummary.openShifts} label="Open shifts" />
        </dl>
      </DashboardCard>

      {/* Open shifts near you */}
      {openShift && (
        <DashboardCard className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              OPEN SHIFTS NEAR YOU
            </div>
            <button
              type="button"
              onClick={() => onNavigate("shifts")}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              View all
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {mockOpenShifts.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {s.dayLabel} · {s.start} – {s.end}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {s.role} · {s.station}
                  </div>
                </div>
                <StatusBadge tone="success">+£{Math.round(s.hours * 18)}</StatusBadge>
              </div>
            ))}
          </div>
        </DashboardCard>
      )}

      {/* Today's notice preview */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            TODAY'S NOTICE
          </div>
          {todayNotice.unread && <StatusBadge tone="info">New</StatusBadge>}
        </div>
        <div className="mt-2 text-sm font-semibold">{todayNotice.title}</div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{todayNotice.body}</div>
        <button
          type="button"
          onClick={() => onNavigate("more")}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          More from your team <ArrowRight className="h-3 w-3" />
        </button>
      </DashboardCard>

      {/* Quick actions */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1">
          QUICK ACTIONS
        </div>
        <QuickActionCard
          icon={Calendar}
          title="Request time off"
          description="Book holiday or unavailability"
          onClick={() => onNavigate("leave")}
        />
        <QuickActionCard
          icon={Sparkles}
          title="View shifts"
          description="Upcoming, requests and history"
          onClick={() => onNavigate("shifts")}
        />
        <QuickActionCard
          icon={MessageSquare}
          title="Contact manager"
          description={mockProfile.manager.name}
          onClick={() => onNavigate("more")}
        />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-bold tracking-tight tabular-nums">{value}</dd>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
