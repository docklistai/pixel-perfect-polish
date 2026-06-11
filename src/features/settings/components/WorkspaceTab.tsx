import * as React from "react";
import { toast } from "sonner";
import { SectionCard, FieldLabel, TextField, SelectField } from "./SettingsPrimitives";
import { Upload } from "lucide-react";

export function WorkspaceTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How Docklist appears across your workspace.
        </p>
      </div>

      <SectionCard title="Workspace identity" description="Name, logo, and time-zone defaults.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-xl font-bold text-teal-600 dark:text-teal-400">
            HV
          </div>
          <div className="space-y-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
              onClick={() =>
                toast.info("Logo upload", {
                  description: "Workspace branding opens up with the next plan update.",
                })
              }
            >
              <Upload className="h-3.5 w-3.5" />
              Upload logo
            </button>
            <p className="text-[10px] text-muted-foreground">PNG or SVG · max 2MB</p>
          </div>
          <div className="flex-1 space-y-1.5 sm:ml-4">
            <FieldLabel>Workspace name</FieldLabel>
            <TextField defaultValue="Harbour View Hotel" onChange={onDirty} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <FieldLabel>Default location</FieldLabel>
            <SelectField defaultValue="brighton" onChange={onDirty}>
              <option value="brighton">Harbour View — Brighton</option>
              <option value="hove">The Anchor Inn — Hove</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Time zone</FieldLabel>
            <SelectField defaultValue="europe-london" onChange={onDirty}>
              <option value="europe-london">Europe/London (GMT+1)</option>
              <option value="europe-dublin">Europe/Dublin</option>
              <option value="utc">UTC</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Currency</FieldLabel>
            <SelectField defaultValue="gbp" onChange={onDirty}>
              <option value="gbp">GBP (£)</option>
              <option value="eur">EUR (€)</option>
              <option value="usd">USD ($)</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Pay week ends on</FieldLabel>
            <SelectField defaultValue="sunday" onChange={onDirty}>
              <option value="sunday">Sunday</option>
              <option value="saturday">Saturday</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Workspace owner" description="Primary contact and billing owner.">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            AT
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Alex Thompson</div>
            <div className="truncate text-xs text-muted-foreground font-mono">
              alex.thompson@docklist.co.uk
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-muted/50"
            onClick={() =>
              toast.info("Transfer ownership", {
                description: "Contact Docklist support to transfer the workspace owner.",
              })
            }
          >
            Transfer
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Danger zone"
        description="Irreversible actions for this workspace."
        className="border-danger/30"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-danger/10 bg-danger-soft/20 p-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-danger">Archive workspace</div>
            <p className="text-xs text-muted-foreground">
              Removes from active list. Recoverable for 30 days.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger opacity-50 cursor-not-allowed"
          >
            Archive
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
