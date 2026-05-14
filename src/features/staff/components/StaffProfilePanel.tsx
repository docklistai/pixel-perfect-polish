import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  X,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/dl";
import type { StaffRow } from "../types";
import { mockStaffProfiles } from "../data/mockStaffProfiles";

interface StaffProfilePanelProps {
  member: StaffRow;
  onClose: () => void;
}

const PANEL_ACTIONS = [
  { key: "message", Icon: MessageCircle, getLabel: (name: string) => `Message ${name}` },
  { key: "call", Icon: Phone, getLabel: (name: string) => `Call ${name}` },
  { key: "email", Icon: Mail, getLabel: (name: string) => `Email ${name}` },
  { key: "schedule", Icon: Calendar, getLabel: (name: string) => `View schedule for ${name}` },
  { key: "more", Icon: MoreHorizontal, getLabel: (name: string) => `More actions for ${name}` },
];

const PANEL_TABS = ["Overview", "Documents", "Availability", "Notes"] as const;

const STATUS_CLS: Record<string, string> = {
  Active: "bg-success-soft text-success",
  "On Leave": "bg-accent-purple/10 text-accent-purple",
  Probation: "bg-info-soft text-info",
};

export function StaffProfilePanel({ member, onClose }: StaffProfilePanelProps) {
  const profile = mockStaffProfiles[member.id] ?? null;
  const [activePanelTab, setActivePanelTab] = React.useState(0);

  const overviewFields: [string, string][] = [
    ["Start date", profile?.startDate ?? "—"],
    ["Department", member.dept],
    ["Employment", profile?.employmentType ?? member.contract],
    ["Contracted hours", profile?.contractedHours ?? "—"],
  ];

  const skills = profile?.skills.length
    ? profile.skills
    : [member.role, member.sub].filter(Boolean);
  const visibleSkills = skills.slice(0, 4);
  const extraSkills = skills.length > 4 ? skills.length - 4 : 0;

  const nextShift = profile?.nextShift;
  const hasShift = Boolean(nextShift?.time);

  const statusCls = STATUS_CLS[member.status] ?? "bg-muted text-muted-foreground";

  return (
    <Card className="col-span-12 lg:col-span-3 rounded-2xl p-5 self-start">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">{member.n}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close staff profile"
          className="rounded p-0.5 hover:bg-muted/60 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <img
          src={`https://i.pravatar.cc/96?img=${member.img}`}
          className="h-16 w-16 rounded-full object-cover"
          alt=""
        />
        <div>
          <div className="font-semibold">{member.n}</div>
          <div className="text-xs text-muted-foreground">
            {member.role}
            {member.sub ? ` · ${member.sub}` : ""}
          </div>
          <span
            className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${statusCls}`}
          >
            {member.status}
          </span>
        </div>
      </div>

      <div className="mt-3 text-xs space-y-1">
        <div className="text-foreground">{member.e}</div>
        <div className="text-muted-foreground">Department: {member.dept}</div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {PANEL_ACTIONS.map(({ key, Icon, getLabel }) => (
          <button
            key={key}
            type="button"
            aria-label={getLabel(member.n)}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center"
          >
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>

      <Link
        to="/staff/$staffId"
        params={{ staffId: member.id }}
        className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl border border-brand/30 bg-brand-soft text-brand text-xs font-semibold py-2 hover:bg-brand/10 transition-colors"
      >
        View full profile <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>

      <div
        role="tablist"
        aria-label="Staff panel sections"
        className="mt-5 border-b border-border flex gap-4 text-xs"
      >
        {PANEL_TABS.map((t, i) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={activePanelTab === i}
            onClick={() => setActivePanelTab(i)}
            className={`pb-2 ${activePanelTab === i ? "border-b-2 border-brand text-brand font-semibold" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {activePanelTab === 0 && (
        <>
          <dl className="mt-4 text-xs space-y-2">
            {overviewFields.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5">
            <div className="text-xs font-semibold mb-2">Skills &amp; Certifications</div>
            {visibleSkills.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">No skills recorded</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleSkills.map((t) => (
                  <span key={t} className="rounded-md border border-border px-2 py-0.5 text-[11px]">
                    {t}
                  </span>
                ))}
                {extraSkills > 0 && (
                  <span className="text-[11px] text-brand font-medium">+ {extraSkills} more</span>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 rounded-xl border border-border p-3">
            <div className="text-xs font-semibold mb-2">NEXT SCHEDULED SHIFT</div>
            {hasShift ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-brand" aria-hidden />
                  {nextShift!.date} <span className="ml-auto font-semibold">{nextShift!.time}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{nextShift!.dept}</span>
                  <span>{nextShift!.role}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">No upcoming shift recorded</div>
            )}
          </div>
        </>
      )}

      {activePanelTab === 1 && (
        <dl className="mt-4 text-xs space-y-2">
          {[
            ["Total", String(profile?.documentsSummary.total ?? "—")],
            ["Expiring soon", String(profile?.documentsSummary.expiringSoon ?? "—")],
            ["Missing", String(profile?.documentsSummary.missing ?? "—")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {activePanelTab === 2 && (
        <dl className="mt-4 text-xs space-y-2">
          {[
            ["Usually available", profile?.availability.usuallyAvailable ?? "—"],
            ["Last updated", profile?.availability.updated ?? "—"],
            ["Conflicts", String(profile?.availability.conflicts ?? "—")],
            ["Late changes", String(profile?.availability.lateChanges ?? "—")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
              <dd className="font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {activePanelTab === 3 && (
        <div className="mt-4 text-xs">
          {profile?.notes.length ? (
            <ul className="space-y-2">
              {profile.notes.slice(0, 2).map((n, i) => (
                <li key={i} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold">{n.author}</span>
                    <span className="text-muted-foreground ml-auto">{n.date}</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed line-clamp-2">{n.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No manager notes recorded.</p>
          )}
        </div>
      )}
    </Card>
  );
}
