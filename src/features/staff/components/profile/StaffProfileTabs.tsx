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
  { id: "insights", label: "Insights" },
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
      className="border-b border-border flex gap-0 mb-6 overflow-x-auto"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeTab === tab.id
              ? "border-b-2 border-brand text-brand"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
