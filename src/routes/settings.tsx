import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  FeedbackBanner,
  EmptyState,
  StatusBadge,
} from "@/components/dl";
import {
  LayoutGrid,
  Users,
  Shield,
  Clock,
  Calendar,
  Bell,
  Smile,
  Cloud,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Docklist" }] }),
  component: SettingsPage,
});

const tabs = [
  { t: "Workspace", s: "General workspace settings", icon: LayoutGrid },
  { t: "Teams", s: "Manage teams and departments", icon: Users },
  { t: "Roles & Permissions", s: "Set roles and access levels", icon: Shield },
  { t: "Time Rules", s: "Rules for time tracking", icon: Clock },
  { t: "Leave Policies", s: "Configure leave policies", icon: Calendar },
  { t: "Notifications", s: "Email and app notifications", icon: Bell },
  { t: "Branding", s: "Customise your brand", icon: Smile },
  { t: "Exports", s: "Payroll and data export settings", icon: Cloud },
];

function Toggle({ on = true, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle setting"
      className={`inline-flex h-5 w-9 rounded-full p-0.5 transition ${on ? "bg-brand" : "bg-muted"}`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

function SettingsPage() {
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("Workspace");
  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace settings, policies and preferences."
        actions={
          <>
            <ActionButton
              variant="secondary"
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                setSaved(false);
              }}
            >
              Discard changes
            </ActionButton>
            <ActionButton
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                setSaved(true);
              }}
            >
              Save changes
            </ActionButton>
          </>
        }
      />

      {dirty && (
        <FeedbackBanner
          tone="warning"
          title="You have unsaved changes"
          description="Save or discard before leaving — frontend example only."
          className="mb-4"
        />
      )}
      {saved && (
        <FeedbackBanner
          tone="success"
          title="Settings saved"
          description="Mock confirmation — nothing has been written."
          className="mb-4"
          onDismiss={() => setSaved(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <Card className="rounded-3xl p-2.5 self-start lg:sticky lg:top-6">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
            SETTINGS
          </div>
          <div className="space-y-1.5">
            {tabs.map((t) => {
              const active = activeTab === t.t;
              return (
                <button
                  key={t.t}
                  type="button"
                  onClick={() => setActiveTab(t.t)}
                  className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-brand/15 bg-brand-soft/70 text-brand shadow-[var(--shadow-card)]"
                      : "border-transparent hover:bg-muted/60"
                  }`}
                >
                  <t.icon
                    className={`h-4 w-4 ${active ? "text-brand" : "text-muted-foreground"}`}
                  />
                  <div>
                    <div className={`text-sm font-medium ${active ? "text-brand" : ""}`}>{t.t}</div>
                    <div className="text-[11px] text-muted-foreground">{t.s}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {activeTab !== "Workspace" ? (
          <Card className="rounded-3xl p-6">
            <EmptyState
              title={`${activeTab} settings`}
              description="This section is a placeholder in the desktop prototype. Workspace tab is fully wired."
            />
          </Card>
        ) : (
          <Card className="rounded-3xl p-5 lg:p-6">
            <div onChange={markDirty} className="space-y-5">
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
                  {[
                    ["Workspace name", "Harbour View Hotel"],
                    ["Address", "1 Harbour Street, Brighton BN1 1AA, United Kingdom"],
                  ].map(([l, v], index) => (
                    <div key={l} className={index === 1 ? "md:col-span-2" : ""}>
                      <label className="text-xs font-medium text-muted-foreground">{l}</label>
                      <input
                        defaultValue={v}
                        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                  <button className="mt-1 flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    Europe/London (GMT+1) <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="mt-1 text-[11px] text-muted-foreground">
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
                    <label className="text-xs text-muted-foreground">Default shift start</label>
                    <input
                      defaultValue="09:00"
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Default shift end</label>
                    <input
                      defaultValue="17:00"
                      className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Default unpaid break</label>
                    <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                      <input defaultValue="30" className="w-full px-3 py-2 text-sm outline-none" />
                      <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                        mins ▾
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle onClick={() => setDirty(true)} />
                  <div>
                    <div className="text-sm font-medium">Auto round shift times</div>
                    <div className="text-xs text-muted-foreground">
                      Round clock in/out times to the nearest 5 minutes.
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Overtime threshold</label>
                  <button className="mt-1 flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                    <span>
                      8 <span className="ml-2 text-muted-foreground">hours per day</span>
                    </span>{" "}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                <div className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Break rules
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Minimum break for shifts over
                    </label>
                    <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                      <input defaultValue="6" className="w-full px-3 py-2 text-sm outline-none" />
                      <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                        hours
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Break duration</label>
                    <div className="mt-1 flex overflow-hidden rounded-xl border border-border">
                      <input defaultValue="30" className="w-full px-3 py-2 text-sm outline-none" />
                      <span className="flex items-center bg-muted px-3 py-2 text-xs text-muted-foreground">
                        mins ▾
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle />
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
                  <Toggle />
                  <div>
                    <div className="text-sm font-medium">Require approval for timesheets</div>
                    <div className="text-xs text-muted-foreground">
                      Managers must approve timesheets before they are finalised.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Toggle />
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
        )}

        <div className="space-y-4">
          <Card className="rounded-3xl p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Payroll-ready export</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Export only. No live sync. Preview payroll-ready data before exporting.
                </p>
              </div>
              <StatusBadge tone="info">Preview</StatusBadge>
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
              Configured export · Payroll-ready only
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Week starts on</label>
              <button className="mt-1 flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                Monday <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Export pay period</label>
              <button className="mt-1 flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                Weekly <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <div className="text-xs font-medium mb-2">Include in export</div>
              {[
                ["Approved timesheets", true],
                ["Approved leave", true],
                ["Unapproved overtime", true],
                ["Breaks as unpaid time", false],
              ].map(([t, on]) => (
                <label key={t as string} className="flex items-center gap-2 py-1 text-sm">
                  <input type="checkbox" defaultChecked={!!on} className="accent-[var(--brand)]" />{" "}
                  {t}
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
                  {[
                    ["Rota", "danger"],
                    ["Time", "info"],
                    ["Leave", "warning"],
                    ["Messages", "purple"],
                  ].map(([t, tone]) => (
                    <div key={t as string} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold`}
                        style={{ background: `var(--${tone}-soft)`, color: `var(--${tone})` }}
                      >
                        •
                      </div>
                      <div className="text-[9px]">{t}</div>
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
                <span className="flex items-center gap-2 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" /> harbour-view-logo.png{" "}
                  <button type="button" className="text-brand">
                    Change
                  </button>
                </span>
              </div>
            </div>
            <button className="mt-3 w-full rounded-xl border border-border py-2 text-xs font-medium">
              Preview branding
            </button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
