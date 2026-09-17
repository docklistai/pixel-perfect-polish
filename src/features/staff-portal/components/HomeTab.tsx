import * as React from "react";
import { Calendar, CalendarDays, Clock, MapPin, MessageSquare } from "lucide-react";
import { DashboardCard } from "@/components/dl";
import { isOvernightLocal } from "@/features/rota/lib/scheduling/calendarInterval";
import { usePortalRota } from "../hooks/usePortalRota";
import { usePortalProfile } from "../hooks/usePortalProfile";
import { noUpcomingShiftsCopy } from "../lib/portalShiftCopy";
import type { PortalShift, PortalTab } from "../types";
import { PortalRotaReadState } from "./PortalRotaReadState";
import { PortalTeamUpdatesCard } from "./PortalTeamUpdatesCard";
import { PortalThisWeekCard } from "./PortalThisWeekCard";
import { ShiftDetailDrawer } from "./ShiftDetailDrawer";

export function HomeTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const rota = usePortalRota();
  const { hasPublished, nextShift } = rota;
  const { data: profile } = usePortalProfile();
  const [selectedShift, setSelectedShift] = React.useState<PortalShift | null>(null);
  const emptyCopy = noUpcomingShiftsCopy(hasPublished);

  if (rota.isLoading || rota.isError) {
    return (
      <PortalRotaReadState isLoading={rota.isLoading} isError={rota.isError} onRetry={rota.retry} />
    );
  }

  return (
    <div className="space-y-4">
      {nextShift ? (
        <DashboardCard className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0B7A78_0%,#0EA5A2_100%)] text-white shadow-[0_20px_48px_-24px_rgba(14,165,162,.75)]">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-white/75 uppercase">
                Your next shift
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white">
                {nextShift.status === "changed" ? "Changed" : "Confirmed"}
              </span>
            </div>
            <div className="mt-2 text-[13px] text-white/80">{nextShift.dayLabel}</div>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-[30px] font-bold tracking-tight leading-none">
                {nextShift.start} – {nextShift.end}
              </span>
              {isOvernightLocal(nextShift.start, nextShift.end) && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                  +1 next day
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1 text-sm text-white/90">
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-white/75" /> {nextShift.role}
              </div>
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-white/75" /> {nextShift.station}
              </div>
            </div>
            <div className="mt-4 text-[11px] font-medium text-white/80">
              From your published rota
            </div>
            <button
              type="button"
              onClick={() => setSelectedShift(nextShift)}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-brand font-semibold shadow-[var(--shadow-card)] hover:bg-white/95"
            >
              <Clock className="h-4 w-4" />
              View shift details
            </button>
          </div>
        </DashboardCard>
      ) : (
        <DashboardCard className="p-5">
          <div className="text-sm font-semibold">{emptyCopy.title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{emptyCopy.description}</p>
        </DashboardCard>
      )}

      <PortalThisWeekCard onNavigate={onNavigate} onSelectShift={setSelectedShift} />

      <PortalTeamUpdatesCard />

      <div className="space-y-2">
        <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Quick actions
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              title: "Request leave",
              description: "Book holiday",
              icon: Calendar,
              tone: "purple",
              tab: "leave" as PortalTab,
            },
            {
              title: "View shifts",
              description: "Upcoming rota",
              icon: CalendarDays,
              tone: "info",
              tab: "shifts" as PortalTab,
            },
            {
              title: "Contact manager",
              description: profile?.manager.name ?? "Manager",
              icon: MessageSquare,
              tone: "success",
              tab: "more" as PortalTab,
            },
          ].map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => onNavigate(action.tab)}
              className="flex min-h-[102px] flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-left shadow-[var(--shadow-card)] hover:bg-muted/40"
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                  action.tone === "purple"
                    ? "bg-accent-purple-soft text-accent-purple"
                    : action.tone === "success"
                      ? "bg-success-soft text-success"
                      : "bg-info-soft text-info"
                }`}
              >
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold leading-tight">{action.title}</div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                {action.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <ShiftDetailDrawer shift={selectedShift} onClose={() => setSelectedShift(null)} />
    </div>
  );
}
