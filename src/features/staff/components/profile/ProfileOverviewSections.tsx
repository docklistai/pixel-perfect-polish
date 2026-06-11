import * as React from "react";
import { AlertTriangle, ChevronRight, Clock, Sparkles, type LucideIcon } from "lucide-react";
import { ProfileCard, Pair } from "./ProfileCard";
import { ProfileManagerActions } from "./ProfileManagerActions";
import type { StaffProfile } from "../../types";
import type { ProfileTab } from "./StaffProfileTabs";

const SKILL_LEVEL: Record<string, { label: string; cls: string }> = {
  "Food Hygiene Level 2": { label: "Certified", cls: "bg-info-soft text-info" },
  "Food hygiene L2": { label: "Certified", cls: "bg-info-soft text-info" },
  "First Aid": { label: "Certified", cls: "bg-success-soft text-success" },
  "First Aid Certificate": { label: "Certified", cls: "bg-success-soft text-success" },
  "Floor Manager": { label: "Advanced", cls: "bg-brand-soft text-brand" },
  "Customer Service": { label: "Expert", cls: "bg-success-soft text-success" },
  Supervisor: { label: "Advanced", cls: "bg-brand-soft text-brand" },
  "Opening Shift": { label: "Verified", cls: "bg-success-soft text-success" },
  "Cash Handling": { label: "Verified", cls: "bg-success-soft text-success" },
  "Allergen Awareness": { label: "Expiring", cls: "bg-warning-soft text-warning" },
  "Personal Licence": { label: "Expiring", cls: "bg-warning-soft text-warning" },
};

function getSkillLevel(skill: string) {
  return SKILL_LEVEL[skill] ?? { label: "Verified", cls: "bg-muted text-muted-foreground" };
}

function dateParts(date: string) {
  const dayNumber = date.match(/\b\d{1,2}\b/)?.[0] ?? "--";
  const label = date.replace(dayNumber, "").replace(/,\s*/, " ").trim();
  return { dayNumber, label };
}

interface OverviewSectionProps {
  profile: StaffProfile;
  onTabChange: (tab: ProfileTab) => void;
  onToast: (msg: string) => void;
}

interface SnapStatProps {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "green" | "amber";
}

function SnapStat({ label, value, sub, tone = "default" }: SnapStatProps) {
  const valueCls =
    tone === "green" ? "text-success" : tone === "amber" ? "text-warning" : "text-foreground";
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 truncate">
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums leading-none ${valueCls}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">{sub}</div>
    </div>
  );
}

export function ManagerSnapshotCard({ profile, onTabChange, onToast }: OverviewSectionProps) {
  const summary = profile.managerSnapshot.filter(
    (line) => !line.startsWith("Watch:") && !line.startsWith("Next action:"),
  );
  const watch = profile.managerSnapshot.find((line) => line.startsWith("Watch:"));
  const action = profile.managerSnapshot.find((line) => line.startsWith("Next action:"));
  const firstName = profile.name.split(" ")[0];

  const docsValue =
    profile.documentsSummary.missing > 0
      ? `${profile.documentsSummary.missing} missing`
      : profile.documentsSummary.expiringSoon > 0
        ? `${profile.documentsSummary.expiringSoon} expiring`
        : "Up to date";
  const docsTone =
    profile.documentsSummary.missing > 0 || profile.documentsSummary.expiringSoon > 0
      ? "amber"
      : "green";

  return (
    <ProfileCard
      title="Manager snapshot"
      className="p-0 overflow-hidden"
      action={
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-500"
          style={{ color: "var(--teal-400)" }}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Updated just now
        </span>
      }
    >
      <div className="grid grid-cols-4 gap-4 px-5 pt-5 pb-4 border-b border-border/50">
        <SnapStat
          label="Hours this week"
          value={`${profile.workloadBalance.hoursThisWeek}h`}
          sub={`${profile.contractedHours} contracted`}
        />
        <SnapStat label="Coverage gaps" value="0" sub="No conflicts this week" tone="green" />
        <SnapStat
          label="Documents"
          value={docsValue}
          sub={
            profile.documentsSummary.missing > 0 || profile.documentsSummary.expiringSoon > 0
              ? "Requires attention"
              : "All verified"
          }
          tone={docsTone}
        />
        <SnapStat
          label="Leave balance"
          value={`${profile.leaveAbsence.annualLeaveRemaining} days`}
          sub="of 28 · remaining"
        />
      </div>
      <div className="rounded-xl border border-brand/20 bg-brand-soft p-5 m-4 mt-4">
        <div className="flex items-center gap-2 text-brand mb-3">
          <div className="size-8 rounded-full bg-brand text-white flex items-center justify-center">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div className="text-xs font-bold">AI summary</div>
        </div>
        <p className="text-sm leading-6 text-foreground text-pretty">{summary.join(" ")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTabChange("documents")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-brand hover:bg-muted/50 border border-brand/20"
          >
            Resolve documents
            <ChevronRight className="size-3" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onTabChange("notes")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-brand hover:bg-muted/50 border border-brand/20"
          >
            Open notes
            <ChevronRight className="size-3" aria-hidden />
          </button>
        </div>
      </div>
      {(watch || action) && (
        <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2">
          {watch && <SnapshotCallout icon={AlertTriangle} text={watch} tone="warning" />}
          {action && <SnapshotCallout icon={ChevronRight} text={action} tone="brand" />}
        </div>
      )}
    </ProfileCard>
  );
}

function SnapshotCallout({
  icon: Icon,
  text,
  tone,
}: {
  icon: LucideIcon;
  text: string;
  tone: "warning" | "brand";
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 flex items-start gap-2 ${
        tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand"
      }`}
    >
      <Icon className="size-3.5 shrink-0 mt-0.5" aria-hidden />
      <p className="text-xs font-medium leading-snug">{text}</p>
    </div>
  );
}

export function NextShiftCard({ profile, onTabChange }: OverviewSectionProps) {
  const { dayNumber, label } = dateParts(profile.nextShift.date);

  return (
    <ProfileCard
      title="Next scheduled shift"
      className="p-5"
      action={
        <button
          type="button"
          onClick={() => onTabChange("schedule")}
          className="text-[11px] text-brand font-semibold hover:underline"
        >
          View schedule
        </button>
      }
    >
      <div className="flex gap-5">
        <div className="w-24 shrink-0">
          <div className="font-mono text-5xl font-bold leading-none tabular-nums">{dayNumber}</div>
          <div className="mt-1 text-xs font-semibold text-muted-foreground uppercase leading-tight">
            {label}
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-brand" aria-hidden />
            <span className="font-mono tabular-nums">{profile.nextShift.time}</span>
          </div>
          <Pair label="Team" value={profile.nextShift.dept} />
          <Pair label="Role" value={profile.nextShift.role} />
          <Pair label="Location" value={profile.nextShift.location ?? "Main site"} />
          <Pair label="Status" value={<span className="text-success">Published</span>} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
        {profile.upcomingShifts.slice(0, 4).map((shift) => (
          <span
            key={`${shift.date}-${shift.time}`}
            className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[11px] font-semibold"
          >
            {shift.date.split(",")[0]} · {shift.time}
          </span>
        ))}
      </div>
    </ProfileCard>
  );
}

export function SkillsTrainingCard({ profile }: { profile: StaffProfile }) {
  return (
    <ProfileCard title="Skills & training" className="p-5">
      {profile.skills.length === 0 ? (
        <span className="text-xs text-muted-foreground">No skills recorded</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => {
            const level = getSkillLevel(skill);
            return (
              <div
                key={skill}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm"
              >
                <span className="text-xs font-medium">{skill}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${level.cls}`}>
                  {level.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ProfileCard>
  );
}

export function ManagerActionsCard({ profile, onToast }: OverviewSectionProps) {
  return (
    <div className="dock-card p-5">
      <ProfileManagerActions firstName={profile.name.split(" ")[0]} onToast={onToast} />
    </div>
  );
}
