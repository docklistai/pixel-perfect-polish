import * as React from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Users, CalendarRange, ScrollText } from "lucide-react";
import { SectionCard, ToggleRow, SelectField, FieldLabel, PreviewTag } from "./SettingsPrimitives";

const EXPORT_CARDS = [
  {
    title: "Rota & shifts",
    description: "Published rotas with assignments and open shifts.",
    format: "CSV · per week",
    icon: CalendarRange,
  },
  {
    title: "Approved timesheets",
    description: "Approved hours only — ready to export as a clean CSV.",
    format: "CSV · per pay period",
    icon: FileSpreadsheet,
  },
  {
    title: "Staff records",
    description: "Contact details, roles, and contract summaries.",
    format: "CSV · full workspace",
    icon: Users,
  },
] as const;

const AUDIT_EVENTS = [
  { event: "Rota published — week of 8 Jun", who: "Workspace manager", when: "Mon 8 Jun, 16:42" },
  { event: "Timesheet approved", who: "Workspace manager", when: "Mon 8 Jun, 09:15" },
  { event: "Leave approved", who: "Workspace manager", when: "Sun 7 Jun, 18:03" },
  { event: "Role updated — FOH Supervisor", who: "Workspace manager", when: "Fri 5 Jun, 11:27" },
] as const;

export function ExportsTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Data & privacy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Security controls, data exports, and how long records are kept.
        </p>
      </div>

      <SectionCard title="Security" description="Sign-in and session rules for this workspace.">
        <div className="space-y-3">
          <ToggleRow
            label="Require two-factor authentication for managers"
            description="Managers confirm sign-in with a second device."
            ariaLabel="Require two-factor authentication toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Single sign-on (SSO)"
            description="Sign in through your company identity provider."
            ariaLabel="Single sign-on toggle"
            onDirty={onDirty}
            defaultOn={false}
            preview
          />
          <ToggleRow
            label="Sign out inactive sessions"
            description="Manager sessions end automatically after 12 hours of inactivity."
            ariaLabel="Sign out inactive sessions toggle"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Export data"
        description="Download workspace data as CSV. Approved records only — exports never include draft rotas."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {EXPORT_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-muted/15 p-4"
            >
              <div className="space-y-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <card.icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="text-sm font-semibold">{card.title}</div>
                <p className="text-xs leading-relaxed text-muted-foreground">{card.description}</p>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.format}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  toast.success(`${card.title} export prepared`, {
                    description: "Your download will start shortly.",
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Export
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Data retention"
        description="How long records stay available before they are archived."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Timesheets</FieldLabel>
            <SelectField defaultValue="6y" onChange={onDirty}>
              <option value="6y">6 years (recommended)</option>
              <option value="3y">3 years</option>
              <option value="2y">2 years</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Rota history</FieldLabel>
            <SelectField defaultValue="2y" onChange={onDirty}>
              <option value="2y">2 years</option>
              <option value="1y">1 year</option>
              <option value="6m">6 months</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Audit log</FieldLabel>
            <SelectField defaultValue="12m" onChange={onDirty}>
              <option value="12m">12 months</option>
              <option value="6m">6 months</option>
              <option value="3m">3 months</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Audit log"
        badge={<PreviewTag>Demo data</PreviewTag>}
        description="Sample entries — the live workspace audit log arrives in a later update."
      >
        <div className="space-y-2">
          {AUDIT_EVENTS.map((entry) => (
            <div
              key={entry.event}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ScrollText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{entry.event}</div>
                  <div className="text-xs text-muted-foreground">{entry.who}</div>
                </div>
              </div>
              <div className="shrink-0 text-xs text-muted-foreground">{entry.when}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            toast.info("Full audit log", {
              description: "The complete log export is included in the next plan update.",
            })
          }
          className="mt-3 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
        >
          View full log
        </button>
      </SectionCard>
    </div>
  );
}
