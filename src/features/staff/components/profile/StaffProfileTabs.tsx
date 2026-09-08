import * as React from "react";
import { cn } from "@/lib/utils";
import { nextProfileTabIndex } from "../../lib/profileTabKeyboard";
import { ALL_PROFILE_TABS, type ProfileTab, type ProfileTabDefinition } from "./profileTabs";

// Re-exported as types only, so this file keeps exporting just its component and
// every existing `import { type ProfileTab } from "./StaffProfileTabs"` still
// resolves. The values live in ./profileTabs.
export type { ProfileTab, ProfileTabDefinition } from "./profileTabs";

interface StaffProfileTabsProps {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  /** Which sections to offer. Defaults to every section, for demo profiles. */
  tabs?: readonly ProfileTabDefinition[];
}

export function StaffProfileTabs({
  activeTab,
  onChange,
  tabs: TABS = ALL_PROFILE_TABS,
}: StaffProfileTabsProps) {
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.id === activeTab),
  );

  // Roving tabIndex: the tablist is one Tab stop, and Left/Right/Home/End move
  // between the tabs inside it — the WAI-ARIA tabs pattern. Selection follows
  // focus, so the moved-to tab is both focused and shown.
  const moveTo = (index: number) => {
    const tab = TABS[index]!;
    onChange(tab.id);
    document.getElementById(`staff-profile-tab-${tab.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Staff profile sections"
      className="mb-6 flex overflow-x-auto border-b border-border"
    >
      {TABS.map((tab, index) => (
        <button
          key={tab.id}
          id={`staff-profile-tab-${tab.id}`}
          role="tab"
          type="button"
          aria-controls={`staff-profile-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange(tab.id);
              return;
            }
            const next = nextProfileTabIndex(e.key, index, TABS.length);
            if (next === null) return;
            e.preventDefault();
            moveTo(next);
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
