import * as React from "react";
import { Card } from "@/components/dl";
import { settingsTabs } from "../data/settingsTabs";

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <Card className="rounded-3xl p-2.5 self-start lg:sticky lg:top-6">
      <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
        SETTINGS
      </div>
      <nav aria-label="Settings navigation">
        <div className="space-y-1.5">
          {settingsTabs.map((t) => {
            const active = activeTab === t.t;
            return (
              <button
                key={t.t}
                type="button"
                onClick={() => onTabChange(t.t)}
                aria-current={active ? "page" : undefined}
                className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-brand/15 bg-brand-soft/70 text-brand shadow-[var(--shadow-card)]"
                    : "border-transparent hover:bg-muted/60"
                }`}
              >
                <t.icon className={`h-4 w-4 ${active ? "text-brand" : "text-muted-foreground"}`} />
                <div>
                  <div className={`text-sm font-medium ${active ? "text-brand" : ""}`}>{t.t}</div>
                  <div className="text-[11px] text-muted-foreground">{t.s}</div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </Card>
  );
}
