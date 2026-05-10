import { Calendar, Clock, MapPin, Phone, Mail, MessageSquare, ArrowRight } from "lucide-react";
import { ActionButton, DashboardCard, QuickActionCard, StatusBadge } from "@/components/dl";
import { mockNextShift, mockNotices, mockProfile, mockWeeklySummary } from "../data/mockPortalData";
import type { PortalTab } from "../types";

export function HomeTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const todayNotice = mockNotices.find((n) => n.unread) ?? mockNotices[0];

  return (
    <div className="space-y-4">
      {/* Next shift hero */}
      <DashboardCard className="p-5 bg-gradient-to-br from-brand-soft to-card">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            NEXT SHIFT
          </div>
          <StatusBadge tone="success">Confirmed</StatusBadge>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">
          {mockNextShift.start} – {mockNextShift.end}
        </div>
        <div className="mt-1 text-sm text-foreground">{mockNextShift.dayLabel}</div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Detail icon={MapPin} label="Station" value={mockNextShift.station} />
          <Detail icon={Calendar} label="Role" value={mockNextShift.role} />
          <Detail
            icon={Clock}
            label="Hours"
            value={`${mockNextShift.hours}h · ${mockNextShift.breakMinutes}m break`}
          />
        </dl>
        {mockNextShift.note && (
          <div className="mt-3 text-xs text-muted-foreground">{mockNextShift.note}</div>
        )}
        <div className="mt-4">
          <ActionButton onClick={() => onNavigate("schedule")} iconRight={ArrowRight}>
            View shift
          </ActionButton>
        </div>
      </DashboardCard>

      {/* Time clock card */}
      <DashboardCard className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              TIME CLOCK
            </div>
            <div className="mt-1 text-base font-semibold">Not clocked in</div>
            <div className="text-xs text-muted-foreground">Clock in when you arrive on shift.</div>
          </div>
          <StatusBadge tone="muted" dot>
            Off shift
          </StatusBadge>
        </div>
        <div className="mt-4">
          <ActionButton onClick={() => onNavigate("clock")} icon={Clock}>
            Clock in
          </ActionButton>
        </div>
      </DashboardCard>

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
          onClick={() => onNavigate("notices")}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          Read notices <ArrowRight className="h-3 w-3" />
        </button>
      </DashboardCard>

      {/* Weekly summary */}
      <DashboardCard className="p-5">
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          THIS WEEK
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {mockWeeklySummary.shifts} shifts ·{" "}
          <span className="text-foreground">{mockWeeklySummary.hours}h</span>
        </div>
        <div className="text-xs text-muted-foreground">Across the bar this week.</div>
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
          onClick={() => onNavigate("requests")}
        />
        <QuickActionCard
          icon={Clock}
          title="View schedule"
          description="See your week"
          onClick={() => onNavigate("schedule")}
        />
        <QuickActionCard
          icon={MessageSquare}
          title="Contact manager"
          description={mockProfile.manager.name}
          onClick={() => onNavigate("profile")}
        />
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium truncate">{value}</dd>
      </div>
    </div>
  );
}

// Re-export icons used elsewhere if needed
export { Phone, Mail };
