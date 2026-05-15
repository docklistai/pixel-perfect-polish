import * as React from "react";
import { AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/dl";
import { ProfileCard, Pair, SectionLabel, CardTile } from "./ProfileCard";
import type { StaffProfile } from "../../types";
import type { ProfileTab } from "./StaffProfileTabs";
import { ProfileLeaveCard } from "./ProfileLeaveCard";
import { ProfileWorkloadCard } from "./ProfileWorkloadCard";
import { ProfileNext7Days } from "./ProfileNext7Days";
import { ProfileActivityFeed } from "./ProfileActivityFeed";

interface Props {
  profile: StaffProfile;
  onTabChange: (tab: ProfileTab) => void;
}

function portalTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "Pending") return "warning";
  return "muted";
}

export function ProfileOverviewTab({ profile, onTabChange }: Props) {
  const {
    workloadBalance: wb,
    leaveAbsence: la,
    nextShift,
    documentsSummary: ds,
    availability: av,
    portalAccess: pa,
  } = profile;

  const snapshotSummary = profile.managerSnapshot.filter(
    (l) => !l.startsWith("Watch:") && !l.startsWith("Next action:"),
  );
  const snapshotWatch = profile.managerSnapshot.find((l) => l.startsWith("Watch:"));
  const snapshotAction = profile.managerSnapshot.find((l) => l.startsWith("Next action:"));

  return (
    <div className="space-y-10">
      {/* Section 1: Manager overview */}
      <div className="grid grid-cols-12 gap-5">
        <ProfileCard
          title="Manager snapshot"
          titleClassName="text-xs text-brand font-bold"
          className="col-span-12 lg:col-span-6 p-6"
          variant="highlight"
        >
          <div className="space-y-2 mb-4">
            {snapshotSummary.map((line, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed">
                {line}
              </p>
            ))}
          </div>
          {(snapshotWatch || snapshotAction) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 border-t border-border/40">
              {snapshotWatch && (
                <div
                  className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                  style={{ backgroundColor: "var(--warning-soft)" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs font-medium text-warning leading-snug">{snapshotWatch}</p>
                </div>
              )}
              {snapshotAction && (
                <div
                  className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                  style={{ backgroundColor: "color-mix(in oklch, var(--brand-soft) 70%, white)" }}
                >
                  <ChevronRight className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs font-medium text-brand leading-snug">{snapshotAction}</p>
                </div>
              )}
            </div>
          )}
        </ProfileCard>

        <ProfileCard
          title="Next scheduled shift"
          className="col-span-12 lg:col-span-3 p-5"
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
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-brand" aria-hidden />
            <span className="text-sm font-bold">{nextShift.date}</span>
          </div>
          {nextShift.time && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 mb-2">
              <div className="text-base font-bold tabular-nums">{nextShift.time}</div>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {nextShift.dept} · {nextShift.role}
          </div>
        </ProfileCard>

        <ProfileLeaveCard la={la} />
      </div>

      {/* Section 2: Scheduling context */}
      <div className="space-y-4">
        <SectionLabel>Scheduling context</SectionLabel>
        <div className="grid grid-cols-12 gap-5">
          <ProfileWorkloadCard wb={wb} />

          <ProfileCard title="Flags" className="col-span-12 lg:col-span-4 p-5">
            {profile.flags.length === 0 ? (
              <span className="text-xs text-muted-foreground">No active flags</span>
            ) : (
              <ul className="space-y-3">
                {profile.flags.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-1 h-2 w-2 rounded-full bg-warning shrink-0" aria-hidden />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </ProfileCard>
        </div>
      </div>

      {/* Section 3: Staff record */}
      <div className="space-y-4">
        <SectionLabel>Staff record</SectionLabel>
        <div className="grid grid-cols-12 gap-5">
          <ProfileCard title="Profile overview" className="col-span-12 lg:col-span-4 p-5">
            <Pair
              label="Email"
              value={<span className="truncate max-w-[140px] block">{profile.email}</span>}
            />
            <Pair label="Phone" value={profile.phone || "—"} />
            <Pair label="Start date" value={profile.startDate} />
            <Pair label="Department" value={profile.dept} />
            <Pair label="Employment type" value={profile.employmentType} />
            <Pair label="Contracted hours" value={profile.contractedHours} />
          </ProfileCard>

          <ProfileCard title="Skills & training" className="col-span-12 lg:col-span-5 p-5">
            {profile.skills.length === 0 ? (
              <span className="text-xs text-muted-foreground">No skills recorded</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </ProfileCard>

          <ProfileCard
            title="Documents"
            className="col-span-12 lg:col-span-3 p-5"
            action={
              <button
                type="button"
                onClick={() => onTabChange("documents")}
                className="text-[11px] text-brand font-semibold hover:underline"
              >
                View docs
              </button>
            }
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              <CardTile label="Total" value={ds.total} />
              <CardTile
                label="Expiring"
                value={ds.expiringSoon}
                tone={ds.expiringSoon > 0 ? "warning" : "default"}
              />
              <CardTile
                label="Missing"
                value={ds.missing}
                tone={ds.missing > 0 ? "danger" : "default"}
              />
            </div>
            {ds.missing > 0 || ds.expiringSoon > 0 ? (
              <p
                className={`text-[11px] leading-snug ${ds.missing > 0 ? "text-warning" : "text-muted-foreground"}`}
              >
                {ds.missing > 0
                  ? `${ds.missing} document${ds.missing > 1 ? "s" : ""} missing — review before next audit.`
                  : `${ds.expiringSoon} expiring soon — check Documents tab.`}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-snug">
                All documents up to date.
              </p>
            )}
          </ProfileCard>
        </div>
      </div>

      {/* Section 4: Activity & access */}
      <div className="space-y-4">
        <SectionLabel>Activity &amp; access</SectionLabel>
        <div className="grid grid-cols-12 gap-5">
          <ProfileActivityFeed recentActivity={profile.recentActivity} />
          <ProfileNext7Days upcomingShifts={profile.upcomingShifts} />
        </div>

        <div className="grid grid-cols-12 gap-5">
          <ProfileCard title="Availability reliability" className="col-span-12 lg:col-span-6 p-5">
            <Pair label="Last updated" value={av.updated} />
            <Pair label="Availability conflicts" value={av.conflicts} />
            <Pair label="Late changes this month" value={av.lateChanges} />
            <Pair label="Usually available" value={av.usuallyAvailable} />
          </ProfileCard>

          <ProfileCard title="Staff portal access" className="col-span-12 lg:col-span-6 p-5">
            <Pair
              label="Status"
              value={<StatusBadge tone={portalTone(pa.status)}>{pa.status}</StatusBadge>}
            />
            <Pair label="Last login" value={pa.lastLogin} />
            <p className="mt-3 pt-3 border-t border-border/40 text-[11px] text-muted-foreground leading-snug">
              Portal access changes will be available once the portal is connected.
            </p>
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
