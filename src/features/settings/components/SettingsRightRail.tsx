import * as React from "react";
import { Card, StatusBadge } from "@/components/dl";
import { Image as ImageIcon } from "lucide-react";

interface SettingsRightRailProps {
  activeTab: string;
}

export function SettingsRightRail({ activeTab }: SettingsRightRailProps) {
  if (activeTab !== "Workspace") return null;

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Data export</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Export only. No live sync. Preview rota and timesheet data before exporting.
            </p>
          </div>
          <StatusBadge tone="info">Preview</StatusBadge>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
          Configured export · Rota and timesheets
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Week starts on</span>
          <span className="text-sm font-medium">Monday</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Export period</span>
          <span className="text-sm font-medium">Weekly</span>
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium mb-2">Include in export</div>
          {(
            [
              ["Approved timesheets", true],
              ["Approved leave", true],
              ["Unapproved overtime", true],
              ["Breaks as unpaid time", false],
            ] as [string, boolean][]
          ).map(([label, checked]) => (
            <label key={label} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" defaultChecked={checked} className="accent-[var(--brand)]" />{" "}
              {label}
            </label>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl p-4 lg:p-5">
        <div className="text-sm font-semibold">Brand preview</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          See how your brand appears in the staff app.
        </p>
        <div className="mt-3 rounded-2xl border border-border overflow-hidden">
          <div
            className="px-4 py-3 text-white text-xs flex items-center justify-between"
            style={{ background: "var(--gradient-brand)" }}
          >
            <span>← Harbour View Hotel</span>
          </div>
          <div className="p-4 bg-muted/30">
            <div className="mx-auto h-12 w-20 rounded-md bg-white flex items-center justify-center text-[9px] font-semibold leading-tight text-center">
              HVH
              <br />
              HARBOUR VIEW
              <br />
              HOTEL
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(
                [
                  ["Rota", "danger"],
                  ["Time", "info"],
                  ["Leave", "warning"],
                  ["Messages", "purple"],
                ] as [string, string][]
              ).map(([label, tone]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                  >
                    •
                  </div>
                  <div className="text-[9px]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Primary colour</span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-brand" /> #0EA5A2
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Accent colour</span>
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-accent-purple" /> #8B5CF6
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Logo</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" /> harbour-view-logo.png
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
