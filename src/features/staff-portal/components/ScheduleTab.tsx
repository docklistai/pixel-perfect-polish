import { CalendarOff } from "lucide-react";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/dl";
import { mockWeekShifts } from "../data/mockPortalData";
import type { PortalShift, ShiftStatus } from "../types";

const statusTone: Record<ShiftStatus, "success" | "warning" | "info"> = {
  confirmed: "success",
  open: "info",
  changed: "warning",
};

const statusLabel: Record<ShiftStatus, string> = {
  confirmed: "Confirmed",
  open: "Open shift",
  changed: "Changed",
};

export function ScheduleTab() {
  const shifts = mockWeekShifts;
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          THIS WEEK
        </div>
        <h2 className="text-xl font-semibold tracking-tight mt-1">Mon 11 – Sun 17 May</h2>
        <p className="text-xs text-muted-foreground mt-1">All times Europe/London.</p>
      </div>

      {shifts.length === 0 ? (
        <DashboardCard className="p-6">
          <EmptyState
            icon={CalendarOff}
            title="No shifts published yet"
            description="Your manager hasn't published this week's rota. Check back soon."
          />
        </DashboardCard>
      ) : (
        <ul className="space-y-3">
          {shifts.map((s) => (
            <ShiftRow key={s.id} shift={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShiftRow({ shift }: { shift: PortalShift }) {
  return (
    <li>
      <DashboardCard className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              {shift.dayLabel}
            </div>
            <div className="mt-1 text-base font-semibold">
              {shift.start} – {shift.end}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {shift.role} · {shift.station} · {shift.breakMinutes}m break
            </div>
            {shift.note && (
              <div className="mt-2 text-xs text-foreground bg-muted/50 rounded-md px-2 py-1">
                {shift.note}
              </div>
            )}
          </div>
          <StatusBadge tone={statusTone[shift.status]}>{statusLabel[shift.status]}</StatusBadge>
        </div>
      </DashboardCard>
    </li>
  );
}
