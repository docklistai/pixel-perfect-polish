import { Card, DetailRow, StatusBadge } from "@/components/dl";

type SettingsTabName =
  | "Workspace"
  | "Teams"
  | "Access"
  | "Time Rules"
  | "Leave Policies"
  | "Notifications"
  | "Branding"
  | "Exports";

interface SettingsRightRailProps {
  activeTab: string;
}

function railCopy(tab: SettingsTabName) {
  switch (tab) {
    case "Teams":
      return {
        title: "Location preview",
        subtitle: "Location labels and team coverage are shown locally only.",
        summaryLabel: "Preview scope",
        summaryValue: "Locations and teams",
        bottomTitle: "Coverage note",
        bottomBody: "Shown in rota and staff previews so managers can spot gaps quickly.",
        details: [
          ["Main venue", "Front of House"],
          ["Kitchen", "Back of house"],
          ["Bar", "Weekends"],
        ] as const,
      };
    case "Access":
      return {
        title: "Role preview",
        subtitle: "Access rules stay in the manager preview only.",
        summaryLabel: "Preview scope",
        summaryValue: "Roles and permissions",
        bottomTitle: "Access note",
        bottomBody: "Keep role descriptions short and honest. No live security wiring here.",
        details: [
          ["General manager", "Publish and review"],
          ["Duty manager", "Draft review"],
          ["Staff", "Own shifts only"],
        ] as const,
      };
    case "Time Rules":
      return {
        title: "Time rule preview",
        subtitle: "Shift defaults and break rules used in the local editor.",
        summaryLabel: "Preview scope",
        summaryValue: "Schedules and breaks",
        bottomTitle: "Timing note",
        bottomBody: "The current view uses local defaults only. It does not change backend rules.",
        details: [
          ["Default start", "09:00"],
          ["Default break", "30 mins"],
          ["Overtime", "8 hours"],
        ] as const,
      };
    case "Leave Policies":
      return {
        title: "Leave preview",
        subtitle: "Policy wording for approval flows and manager review.",
        summaryLabel: "Preview scope",
        summaryValue: "Leave policy cards",
        bottomTitle: "Policy note",
        bottomBody: "Use plain language so the preview feels like a real admin panel.",
        details: [
          ["Approval", "Manager"],
          ["Clashes", "Shown in rota"],
          ["Carry over", "Preview only"],
        ] as const,
      };
    case "Notifications":
      return {
        title: "Reminder preview",
        subtitle: "Notification channels and reminder copy stay local to the page.",
        summaryLabel: "Preview scope",
        summaryValue: "In-app and email",
        bottomTitle: "Delivery note",
        bottomBody: "Keep reminder labels honest. This is a UI preview, not a live service.",
        details: [
          ["Rota", "Publish reminders"],
          ["Leave", "Request alerts"],
          ["Shifts", "Change notices"],
        ] as const,
      };
    case "Branding":
      return {
        title: "Brand preview",
        subtitle: "Light/dark and department accents for the settings preview.",
        summaryLabel: "Preview scope",
        summaryValue: "Brand and colour chips",
        bottomTitle: "Visual note",
        bottomBody: "This mirrors the prototype branding block without adding a new system.",
        details: [
          ["Primary", "Teal"],
          ["Accent", "Purple"],
          ["Logo", "Local preview"],
        ] as const,
      };
    case "Exports":
      return {
        title: "Export preview",
        subtitle: "Export settings are visible before the download flow.",
        summaryLabel: "Preview scope",
        summaryValue: "Rota and timesheets",
        bottomTitle: "Export note",
        bottomBody: "Shown for review only. No live sync, no backend wiring, no payroll claims.",
        details: [
          ["Format", "CSV preview"],
          ["Scope", "Approved data"],
          ["Status", "Preview only"],
        ] as const,
      };
    case "Workspace":
    default:
      return {
        title: "Data export",
        subtitle: "Export only. No live sync. Preview rota and timesheet data before exporting.",
        summaryLabel: "Preview scope",
        summaryValue: "Rota and timesheets",
        bottomTitle: "Brand preview",
        bottomBody: "A small brand card keeps the right rail aligned with the prototype.",
        details: [
          ["Week starts on", "Monday"],
          ["Export period", "Weekly"],
          ["Included", "Approved items"],
        ] as const,
      };
  }
}

export function SettingsRightRail({ activeTab }: SettingsRightRailProps) {
  const copy = railCopy(activeTab as SettingsTabName);

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{copy.title}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.subtitle}</p>
          </div>
          <StatusBadge tone="info">Preview</StatusBadge>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground">
          {copy.summaryLabel} · {copy.summaryValue}
        </div>
        <div className="mt-3 space-y-2">
          {copy.details.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl p-4 lg:p-5">
        <div className="text-sm font-semibold">{copy.bottomTitle}</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.bottomBody}</p>
        <div className="mt-3 rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-[11px] font-semibold text-white">
            <span>Harbour View Hotel</span>
            <span>Preview</span>
          </div>
          <div className="bg-muted/20 p-4">
            <div className="grid gap-2">
              <div className="h-2.5 rounded-full bg-muted" />
              <div className="h-2.5 w-5/6 rounded-full bg-muted" />
              <div className="h-2.5 w-2/3 rounded-full bg-muted" />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {["Rota", "Time", "Leave", "Messages"].map((label, index) => (
                <div key={label} className="space-y-1">
                  <div
                    className={[
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-xl",
                      index === 0 ? "bg-danger-soft text-danger" : "",
                      index === 1 ? "bg-info-soft text-info" : "",
                      index === 2 ? "bg-warning-soft text-warning" : "",
                      index === 3 ? "bg-accent-purple-soft text-accent-purple" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    •
                  </div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
