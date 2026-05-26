import * as React from "react";
import { AlertTriangle, Calendar, ChevronRight, Clock, Sparkles } from "lucide-react";
import { ProfileCard, Pair } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

export function ProfileInsightsTab({ profile }: Props) {
  const weeklyHours = profile.weeklyHours ?? [7.5, 8, 7, 0, 8, 6.5, 0];
  const avgHours = profile.workloadBalance.avgLast4Weeks || 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard
          title="Pattern summary"
          className="p-0 overflow-hidden"
          action={
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
              AI-assisted
            </span>
          }
        >
          <div className="border-b border-border/50 bg-[var(--st-teal-bg)] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand text-white">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--st-teal-ink)]">
                  AI summary
                </div>
                <p className="mt-1 text-sm leading-6 text-foreground text-pretty">
                  {profile.name.split(" ")[0]} is on track this week - steady hours, no rota
                  conflicts, and a healthy rest gap. Two documents still need attention before the
                  next renewal cycle, and availability is concentrated around weekday mornings and
                  afternoons.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => undefined}
                    className="inline-flex items-center gap-1 text-[var(--st-teal-ink)] hover:underline"
                  >
                    Resolve documents <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={() => undefined}
                    className="inline-flex items-center gap-1 text-[var(--st-teal-ink)] hover:underline"
                  >
                    Open notes <ChevronRight className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3">
              <Pair label="Average weekly hours" value={`${avgHours}h`} />
              <Pair label="Weekend load" value={profile.workloadBalance.weekendLoad} />
              <Pair label="Rest gap" value={profile.workloadBalance.restGap} />
            </div>
          </div>
        </ProfileCard>

        <ProfileCard title="Hours trend">
          <div className="grid h-[140px] grid-cols-8 items-end gap-2">
            {[28, 31, 26, 33, 36, 30, 29, 32].map((hours, index) => {
              const pct = hours / 40;
              const label = `W${17 - index + 1}`;
              return (
                <div
                  key={`${label}-${hours}`}
                  className="flex h-full flex-col items-center justify-end gap-1"
                >
                  <div
                    className="w-full rounded-md"
                    style={{
                      height: `${pct * 100}%`,
                      background:
                        index === 7
                          ? "var(--teal-500)"
                          : hours > 32
                            ? "var(--amber-500)"
                            : "var(--teal-500)",
                      opacity: index === 7 ? 1 : 0.7,
                    }}
                  />
                  <div className="font-mono text-[11px] font-semibold">{hours}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              );
            })}
          </div>
        </ProfileCard>
      </div>

      <div className="space-y-4 min-w-0">
        <ProfileCard
          title="Availability preview"
          action={
            <button
              type="button"
              onClick={() => undefined}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60"
              aria-label="Edit availability"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          <div className="space-y-0">
            {[
              ["Mon", "08:00 – 22:00", "green"],
              ["Tue", "08:00 – 18:00", "green"],
              ["Wed", "Any", "green"],
              ["Thu", "14:00 – 23:00", "green"],
              ["Fri", "Any", "green"],
              ["Sat", "Not available", "red"],
              ["Sun", "After 14:00", "amber"],
            ].map(([day, availability, tone]) => (
              <div
                key={day}
                className="flex items-center border-b border-border/40 py-2.5 last:border-0"
              >
                <span className="w-10 font-semibold text-foreground">{day}</span>
                <span
                  className={`text-sm ${
                    tone === "red"
                      ? "text-danger"
                      : tone === "amber"
                        ? "text-warning"
                        : "text-success"
                  }`}
                >
                  {availability}
                </span>
                <div className="flex-1" />
                {tone === "red" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-hidden />
                ) : tone === "amber" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-success" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </ProfileCard>

        <ProfileCard title="Rota context">
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <Clock className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold">Rota published</div>
                <div className="text-xs text-muted-foreground">
                  Mon-Wed locked. Thu-Sun still draft.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-warning-soft p-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-white">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold">1 coverage gap remaining</div>
                <div className="text-xs text-muted-foreground">
                  Fri 16 May · Bar evening, 17:00 – 23:00
                </div>
              </div>
            </div>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
