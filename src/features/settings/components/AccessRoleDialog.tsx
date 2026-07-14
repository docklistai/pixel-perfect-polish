import { toast } from "sonner";
import { Check, Info, Shield } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
export interface AccessRoleDef {
  id: string;
  name: string;
  people: number;
  scope: string;
  tags: { label: string; tone: "success" | "info" | "warning" | "muted" }[];
  capabilities: [string, boolean][];
}

function tagClass(tone: AccessRoleDef["tags"][number]["tone"]): string {
  if (tone === "success") return "bg-teal-500/10 text-teal-600 dark:text-teal-400";
  if (tone === "warning") return "bg-warning-soft text-warning";
  if (tone === "info") return "bg-info-soft text-info";
  return "bg-muted text-muted-foreground";
}

export function AccessRoleDialog({
  role,
  onClose,
  onDirty,
}: {
  role: AccessRoleDef | null;
  onClose: () => void;
  onDirty: () => void;
}) {
  return (
    <DialogShell
      open={role !== null}
      onOpenChange={(open) => !open && onClose()}
      title={role ? `${role.name} permissions` : ""}
      description={role ? `${role.scope} - ${role.people} people` : ""}
      icon={Shield}
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Close
          </ActionButton>
          <ActionButton
            variant="secondary"
            onClick={() => {
              toast.info("Preview only", {
                description: role
                  ? `"${role.name}" was not duplicated. Custom roles are not live-wired.`
                  : undefined,
              });
              onClose();
            }}
          >
            Preview duplicate
          </ActionButton>
          <ActionButton
            onClick={() => {
              onDirty();
              toast.info("Preview only", {
                description: "No role, permission, auth, or RBAC changes were saved.",
              });
              onClose();
            }}
          >
            Preview save
          </ActionButton>
        </>
      }
    >
      {role && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {role.tags.map((tag) => (
              <span
                key={tag.label}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tagClass(tag.tone)}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
          <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-muted/15 p-4">
            <div className="dock-section-eyebrow mb-1">Capabilities</div>
            {role.capabilities.map(([capability, allowed]) => (
              <div
                key={capability}
                className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0"
              >
                <span className="text-xs font-medium text-foreground">{capability}</span>
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
            <span>Preview only - no role or RBAC changes are written.</span>
          </div>
        </div>
      )}
    </DialogShell>
  );
}
