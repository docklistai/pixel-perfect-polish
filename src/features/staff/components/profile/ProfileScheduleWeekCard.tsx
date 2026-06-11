import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Clock, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useIntents } from "@/lib/interactionIntents";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

type WeekShift = {
  date: string;
  start: string;
  end: string;
  label: string;
  hours: number;
  status: "published" | "draft" | "off";
  flag?: "conflict" | "tight-rest";
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEK_LABELS_MAP: Record<number, string[]> = {
  [-1]: ["Mon 1 Jun", "Tue 2 Jun", "Wed 3 Jun", "Thu 4 Jun", "Fri 5 Jun", "Sat 6 Jun", "Sun 7 Jun"],
  [0]: [
    "Mon 8 Jun",
    "Tue 9 Jun",
    "Wed 10 Jun",
    "Thu 11 Jun",
    "Fri 12 Jun",
    "Sat 13 Jun",
    "Sun 14 Jun",
  ],
  [1]: [
    "Mon 15 Jun",
    "Tue 16 Jun",
    "Wed 17 Jun",
    "Thu 18 Jun",
    "Fri 19 Jun",
    "Sat 20 Jun",
    "Sun 21 Jun",
  ],
};
const BLOCKS = [
  { start: "07:00", end: "15:00", label: "Day" },
  { start: "08:00", end: "16:00", label: "Morning" },
  { start: "14:00", end: "22:00", label: "Evening" },
  { start: "17:00", end: "01:00", label: "Late" },
  { start: "11:00", end: "19:00", label: "Mid" },
];

function buildWeeklySchedule(profile: StaffProfile, weekOffset: number): WeekShift[] {
  const seed = profile.id.charCodeAt(1) || 1;
  const labels = WEEK_LABELS_MAP[weekOffset] ?? WEEK_LABELS_MAP[0]!;

  return labels.map((date, i) => {
    const base = (seed + i + Math.abs(weekOffset)) % 7;
    if (base === 4) {
      return {
        date,
        start: "—",
        end: "—",
        label: "Rest",
        hours: 0,
        status: "off" as const,
      };
    }

    const block = BLOCKS[(seed + i + Math.abs(weekOffset)) % BLOCKS.length]!;
    return {
      date,
      start: block.start,
      end: block.end,
      label: block.label,
      hours: 8,
      status:
        weekOffset === -1
          ? ("published" as const)
          : i < 3
            ? ("published" as const)
            : ("draft" as const),
      flag: base === 5 ? ("conflict" as const) : base === 6 ? ("tight-rest" as const) : undefined,
    };
  });
}

function flagLabel(flag?: WeekShift["flag"]): string | null {
  if (!flag) return null;
  return flag === "conflict" ? "Conflict" : "Tight rest";
}

export function ProfileScheduleWeekCard({ profile }: Props) {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();
  const [weekOffset, setWeekOffset] = React.useState(0);
  const shifts = React.useMemo(
    () => buildWeeklySchedule(profile, weekOffset),
    [profile, weekOffset],
  );
  const weekly = profile.weeklyHours ?? [7.5, 8, 7, 0, 8, 6.5, 0];
  const weekTitle =
    weekOffset === 0
      ? "This week · 8–14 Jun"
      : weekOffset < 0
        ? "Last week · 1–7 Jun"
        : "Next week · 15–21 Jun";

  return (
    <div className="space-y-4 min-w-0">
      <ProfileCard
        title={weekTitle}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/rota"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open in rota
            </Link>
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/rota" });
                requestIntent("rota.addShift");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3 w-3" aria-hidden />
              Add shift
            </button>
          </div>
        }
        className="p-0 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-border text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-4 py-2.5 text-left">Day</th>
                <th className="px-4 py-2.5 text-left">Shift</th>
                <th className="px-4 py-2.5 text-left">Hours</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left" />
                <th className="px-4 py-2.5 text-right" />
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift, index) => (
                <tr
                  key={`${shift.date}-${index}`}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{shift.date}</div>
                  </td>
                  <td className="px-4 py-3">
                    {shift.status === "off" ? (
                      <span className="text-xs text-muted-foreground">Rest day</span>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">
                            {shift.start} – {shift.end}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold">
                            {shift.label}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {profile.dept} · 30 min break
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {shift.status === "off" ? "—" : `${shift.hours.toFixed(1)}h`}
                  </td>
                  <td className="px-4 py-3">
                    {shift.status === "off" ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Off
                      </span>
                    ) : shift.status === "published" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                        <Clock className="h-2.5 w-2.5" aria-hidden />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {shift.flag ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger">
                        <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                        {flagLabel(shift.flag)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {shift.status !== "off" ? (
                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Shift options", {
                            description: `${shift.date} · ${shift.start} – ${shift.end}`,
                          })
                        }
                        aria-label={`Open ${shift.date} shift options`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60"
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
          <span className="text-xs text-muted-foreground">5 shifts · 32.0h scheduled</span>
          <div className="flex-1" />
          <button
            type="button"
            disabled={weekOffset <= -1}
            onClick={() => setWeekOffset(-1)}
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
          >
            Last week
          </button>
          <button
            type="button"
            disabled={weekOffset >= 1}
            onClick={() => setWeekOffset(1)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50 transition-colors"
          >
            Next week
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </ProfileCard>

      <ProfileCard
        title="Typical weekly pattern"
        action={
          <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
            Last 8 weeks
          </span>
        }
      >
        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day, index) => {
            const hours = weekly[index] ?? 0;
            const pct = Math.max(0, Math.min(1, hours / 10));
            return (
              <div key={day} className="flex flex-col items-center gap-2">
                <div className="flex h-[90px] w-full items-end">
                  <div
                    className="w-full rounded-md"
                    style={{
                      height: `${pct * 100}%`,
                      background: hours > 0 ? "var(--teal-500)" : "var(--ink-100)",
                      opacity: hours > 0 ? 0.85 : 0.4,
                    }}
                  />
                </div>
                <div className="font-mono text-[11px] font-semibold tabular-nums">
                  {hours ? `${hours}h` : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">{day}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Avg start 09:14 · avg end 16:42 · 30.0h/wk avg
        </div>
      </ProfileCard>
    </div>
  );
}
