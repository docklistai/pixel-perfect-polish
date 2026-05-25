import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Mail, Phone, Briefcase, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, StatusBadge, type Tone } from "@/components/dl";
import { StaffMonogram } from "../StaffMonogram";
import type { StaffProfile } from "../../types";
import { type ProfileTab } from "./StaffProfileTabs";
import { StaffProfileHeaderActions } from "./StaffProfileHeaderActions";

const HEADER_TABS: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "time", label: "Time" },
  { id: "leave", label: "Leave & Absence" },
  { id: "documents", label: "Documents" },
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
        <div className="flex items-start gap-5 p-6 flex-wrap">
          <StaffMonogram name={profile.name} size="xl" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-2xl font-bold tracking-tight leading-none">{profile.name}</h1>
              <StatusBadge tone={statusTone(profile.status)} dot>
                {profile.status}
              </StatusBadge>
              {profile.status === "Probation" && (
                <span className="inline-flex items-center rounded-md bg-warning-soft text-warning text-[11px] font-semibold px-2 py-0.5">
                  Probation review · 12 Jun
                </span>
              )}
            </div>

            <div className="text-sm text-muted-foreground mt-1">
              {profile.role}
              {profile.sub ? ` · ${profile.sub}` : ""} · {profile.dept}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs text-muted-foreground">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-mono break-all"
              >
                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                {profile.email}
              </a>
              <span className="opacity-40" aria-hidden>
                •
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3 shrink-0" aria-hidden />
                {profile.phone || "+44 7700 900 123"}
              </span>
              <span className="opacity-40" aria-hidden>
                •
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                {profile.employmentType ?? profile.contract} · {profile.contractedHours}
              </span>
              <span className="opacity-40" aria-hidden>
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

        {/* Tab strip inside header card */}
        <div
          role="tablist"
          aria-label="Staff profile sections"
          className="flex border-t border-border overflow-x-auto px-2"
        >
          {HEADER_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`staff-profile-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
                activeTab === tab.id
                  ? "border-b-2 border-brand text-brand"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
