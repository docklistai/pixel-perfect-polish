import * as React from "react";
import { Card } from "@/components/dl";
import { SettingsToggle } from "./SettingsToggle";

interface WorkspaceSectionProps {
  onDirty: () => void;
}

export function WorkspaceSection({ onDirty }: WorkspaceSectionProps) {
  return (
    <Card className="rounded-3xl p-5 lg:p-6">
      {/* onChange on the wrapper catches all child <input> change events via bubbling */}
      <div onChange={onDirty} className="space-y-5">
        <div>
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            Workspace
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Update your workspace details and default settings.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Workspace details
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="workspace-name" className="text-xs font-medium text-muted-foreground">
                Workspace name
              </label>
              <input
                id="workspace-name"
                defaultValue="Harbour View Hotel"
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="workspace-address"
                className="text-xs font-medium text-muted-foreground"
              >
                Address
              </label>
              <input
                id="workspace-address"
                defaultValue="1 Harbour Street, Brighton BN1 1AA, United Kingdom"
                className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Timezone</p>
            <div
              aria-describedby="timezone-help"
              className="mt-1 w-full rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground"
            >
              Europe/London (GMT+1)
            </div>
            <div id="timezone-help" className="mt-1 text-[11px] text-muted-foreground">
              All times in Docklist are shown in this timezone.
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Shift defaults
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label htmlFor="shift-start" className="text-xs text-muted-foreground">
                Default shift start
              </label>
              <input
                id="shift-start"
                defaultValue="09:00"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="text-xs text-muted-foreground">
                Default shift end
              </label>
              <input
                id="shift-end"
                defaultValue="17:00"
                className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="unpaid-break" className="text-xs text-muted-foreground">
                Default unpaid break
              </label>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                <input
                  id="unpaid-break"
                  defaultValue="30"
                  className="w-full px-3 py-2 text-sm outline-none"
                />
                <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                  mins
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SettingsToggle aria-label="Auto round shift times" onClick={onDirty} />
            <div>
              <div className="text-sm font-medium">Auto round shift times</div>
              <div className="text-xs text-muted-foreground">
                Round clock in/out times to the nearest 5 minutes.
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overtime threshold</p>
            <div className="mt-1 w-full rounded-xl border border-border bg-card/70 px-3 py-2 text-sm text-muted-foreground">
              8 hours per day
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Break rules
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="break-shift-over" className="text-xs text-muted-foreground">
                Minimum break for shifts over
              </label>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                <input
                  id="break-shift-over"
                  defaultValue="6"
                  className="w-full px-3 py-2 text-sm outline-none"
                />
                <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                  hours
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="break-duration" className="text-xs text-muted-foreground">
                Break duration
              </label>
              <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                <input
                  id="break-duration"
                  defaultValue="30"
                  className="w-full px-3 py-2 text-sm outline-none"
                />
                <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                  mins
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SettingsToggle aria-label="Break required" onClick={onDirty} />
            <div>
              <div className="text-sm font-medium">Break required</div>
              <div className="text-xs text-muted-foreground">
                Enforce breaks for eligible shifts.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
          <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            Approval settings
          </div>
          <div className="flex items-center gap-3">
            <SettingsToggle aria-label="Require approval for timesheets" onClick={onDirty} />
            <div>
              <div className="text-sm font-medium">Require approval for timesheets</div>
              <div className="text-xs text-muted-foreground">
                Managers must approve timesheets before they are finalised.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SettingsToggle aria-label="Require approval for leave requests" onClick={onDirty} />
            <div>
              <div className="text-sm font-medium">Require approval for leave requests</div>
              <div className="text-xs text-muted-foreground">
                Leave requests must be approved before they are marked as approved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
