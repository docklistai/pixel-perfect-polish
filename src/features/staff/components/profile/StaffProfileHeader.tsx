import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Mail, Phone, Briefcase, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, StatusBadge, type Tone } from "@/components/dl";
import { StaffMonogram } from "../StaffMonogram";
import type { StaffProfile } from "../../types";
import { type ProfileTab } from "./StaffProfileTabs";
import { StaffProfileHeaderActions } from "./StaffProfileHeaderActions";

const HEADER_TABS: { id: ProfileTab; label: string; badge?: { count: number } }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "time", label: "Time" },
  { id: "leave", label: "Leave & Absence" },
  { id: "documents", label: "Documents", badge: { count: 2 } },
  { id: "notes", label: "Notes" },
  { id: "insights", label: "Work patterns" },
];

interface StaffProfileHeaderProps {
  profile: StaffProfile;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

function statusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "On Leave") return "purple";
  if (status === "Probation") return "info";
  return "muted";
}

export function StaffProfileHeader({ profile, activeTab, onTabChange }: StaffProfileHeaderProps) {
  const [toast, setToast] = React.useState<string | null>(null);

  return (
    <div className="mb-6">
      <Link
        to="/staff"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        All staff
      </Link>

      {toast && (
        <div className="mb-4 rounded-xl bg-info-soft text-info text-xs font-medium px-4 py-2.5">
          {toast}
        </div>
      )}

      <Card className="p-0 overflow-visible">
        <div className="flex items-start gap-5 flex-wrap p-6">
          <StaffMonogram name={profile.name} size="xl" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-semibold leading-none tracking-[-0.02em]">
                {profile.name}
              </h1>
              <StatusBadge tone={statusTone(profile.status)} dot>
                {profile.status}
              </StatusBadge>
              {profile.status === "Probation" && (
                <span className="inline-flex items-center rounded-md bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                  Probation review · 12 Jun
                </span>
              )}
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              {profile.role}
              {profile.sub ? ` · ${profile.sub}` : ""} · {profile.dept}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1 font-mono transition-colors hover:text-foreground"
              >
                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                {profile.email}
              </a>
              <span aria-hidden className="opacity-40">
                •
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3 shrink-0" aria-hidden />
                {profile.phone || "+44 7700 900 123"}
              </span>
              <span aria-hidden className="opacity-40">
                •
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                {profile.employmentType ?? profile.contract} · {profile.contractedHours}
              </span>
              <span aria-hidden className="opacity-40">
                •
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" aria-hidden />
                Joined {profile.startDate}
              </span>
            </div>
          </div>

          <StaffProfileHeaderActions
            name={profile.name}
            onToast={(msg) => {
              setToast(msg);
              setTimeout(() => setToast(null), 2200);
            }}
          />
        </div>

        <div
          role="tablist"
          aria-label="Staff profile sections"
          className="flex overflow-x-auto border-t border-border px-2"
        >
          {HEADER_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`staff-profile-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-controls={`staff-profile-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTabChange(tab.id);
                }
              }}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center gap-1.5",
                activeTab === tab.id
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded-md bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold text-warning leading-none">
                  {tab.badge.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
