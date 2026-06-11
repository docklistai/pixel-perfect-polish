import * as React from "react";
import { toast } from "sonner";
import { ActionButton, DialogShell } from "@/components/dl";
import { SectionCard, ToggleRow } from "./SettingsPrimitives";
import { Shield, ChevronRight, Check, Info } from "lucide-react";

interface RoleDef {
  id: string;
  name: string;
  people: number;
  scope: string;
  tags: { label: string; tone: "success" | "info" | "warning" | "muted" }[];
  capabilities: [string, boolean][];
}

const ROLES: RoleDef[] = [
  {
    id: "gm",
    name: "General manager",
    people: 2,
    scope: "Full workspace access",
    tags: [
      { label: "Publish rota", tone: "success" },
      { label: "Settings", tone: "warning" },
    ],
    capabilities: [
      ["Publish rota", true],
      ["Approve timesheets", true],
      ["Approve leave", true],
      ["Post announcements", true],
      ["Edit pay rates", true],
      ["Manage staff records", true],
      ["View own rota", true],
    ],
  },
  {
    id: "dm",
    name: "Duty manager",
    people: 5,
    scope: "Day-to-day operations",
    tags: [
      { label: "Publish rota", tone: "success" },
      { label: "Approve leave", tone: "warning" },
    ],
    capabilities: [
      ["Publish rota", true],
      ["Approve timesheets", true],
      ["Approve leave", true],
      ["Post announcements", true],
      ["Edit pay rates", false],
      ["Manage staff records", true],
      ["View own rota", true],
    ],
  },
  {
    id: "sup",
    name: "Supervisor",
    people: 8,
    scope: "Department-level edits",
    tags: [
      { label: "Edit rota draft", tone: "success" },
      { label: "Approve timesheets", tone: "info" },
    ],
    capabilities: [
      ["Publish rota", false],
      ["Approve timesheets", true],
      ["Approve leave", false],
      ["Post announcements", true],
      ["Edit pay rates", false],
      ["Manage staff records", true],
      ["View own rota", true],
    ],
  },
  {
    id: "tm",
    name: "Team member",
    people: 33,
    scope: "View own shifts only",
    tags: [
      { label: "View only", tone: "muted" },
      { label: "Mobile app", tone: "info" },
    ],
    capabilities: [
      ["Publish rota", false],
      ["Approve timesheets", false],
      ["Approve leave", false],
      ["Post announcements", false],
      ["Edit pay rates", false],
      ["Manage staff records", false],
      ["View own rota", true],
    ],
  },
];

export function AccessTab({ onDirty }: { onDirty: () => void }) {
  const [selectedRole, setSelectedRole] = React.useState<RoleDef | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Roles & permissions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Who can do what across the workspace.</p>
      </div>

      <SectionCard title="System roles" description="Click a role to preview its permissions.">
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRole(role)}
              className="flex flex-col justify-between rounded-2xl border border-border bg-muted/20 p-4 text-left transition hover:bg-muted/30 hover:border-brand/35"
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{role.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {role.people} people · {role.scope}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 self-center" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {role.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      tag.tone === "success"
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : tag.tone === "warning"
                          ? "bg-warning-soft text-warning"
                          : tag.tone === "info"
                            ? "bg-info-soft text-info"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Access policy" description="Fine-tune general permissions.">
        <div className="space-y-3">
          <ToggleRow
            label="Hide pay rates from supervisors"
            description="Only GMs and Duty Managers will see hourly rates."
            ariaLabel="Hide pay rates toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Allow staff to see colleagues' phone numbers"
            description="In-app directory only — does not affect HR records."
            ariaLabel="Allow staff to see phone numbers toggle"
            onDirty={onDirty}
            defaultOn={false}
          />
          <ToggleRow
            label="Require manager approval for all swaps"
            description="Even peer-to-peer swaps."
            ariaLabel="Require swap approval toggle"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <DialogShell
        open={selectedRole !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRole(null);
        }}
        title={selectedRole ? `${selectedRole.name} permissions` : ""}
        description={selectedRole ? `${selectedRole.scope} · ${selectedRole.people} people` : ""}
        icon={Shield}
        footer={
          <>
            <ActionButton variant="ghost" onClick={() => setSelectedRole(null)}>
              Close
            </ActionButton>
            <ActionButton
              variant="secondary"
              onClick={() => {
                toast.success("Role duplicated", {
                  description: selectedRole
                    ? `"${selectedRole.name} (copy)" added as a custom role.`
                    : undefined,
                });
                setSelectedRole(null);
              }}
            >
              Duplicate role
            </ActionButton>
            <ActionButton
              onClick={() => {
                onDirty();
                toast.success("Role updated", {
                  description: "Permission changes apply to everyone in this role.",
                });
                setSelectedRole(null);
              }}
            >
              Save role
            </ActionButton>
          </>
        }
      >
        {selectedRole && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {selectedRole.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    tag.tone === "success"
                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      : tag.tone === "warning"
                        ? "bg-warning-soft text-warning"
                        : tag.tone === "info"
                          ? "bg-info-soft text-info"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tag.label}
                </span>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-muted/15 p-4 space-y-2 max-h-[300px] overflow-y-auto">
              <div className="dock-section-eyebrow mb-1">Capabilities</div>
              {selectedRole.capabilities.map(([cap, allowed], idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
                >
                  <span className="text-xs text-foreground font-medium">{cap}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      allowed
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {allowed ? (
                      <>
                        <Check className="h-2.5 w-2.5" /> Allowed
                      </>
                    ) : (
                      "Restricted"
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 rounded-xl bg-muted/10 p-2.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Changes here apply to everyone in this role.</span>
            </div>
          </div>
        )}
      </DialogShell>
    </div>
  );
}
