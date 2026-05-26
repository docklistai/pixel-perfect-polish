import * as React from "react";
import { cn } from "@/lib/utils";

export type ProfileTab =
  | "overview"
  | "schedule"
  | "time"
  | "leave"
  | "documents"
  | "notes"
  | "insights";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "time", label: "Time" },
  { id: "leave", label: "Leave & Absence" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
  { id: "insights", label: "Work patterns" },
];

interface StaffProfileTabsProps {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

export function StaffProfileTabs({ activeTab, onChange }: StaffProfileTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Staff profile sections"
      className="mb-6 flex overflow-x-auto border-b border-border"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`staff-profile-tab-${tab.id}`}
          role="tab"
          type="button"
          aria-controls={`staff-profile-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(tab.id);
            }
          }}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeTab === tab.id
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
