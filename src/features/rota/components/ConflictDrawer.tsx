import { DrawerShell, FormSection, StatusBadge, ActionButton } from "@/components/dl";
import type { ConflictSummary } from "../types";

export function ConflictDrawer({
  open,
  onOpenChange,
  conflicts,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conflicts: ConflictSummary[];
}) {
  const issueLabel = conflicts.length === 1 ? "1 issue" : `${conflicts.length} issues`;

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota conflicts"
      description={`${conflicts.length} conflicts detected this week.`}
      meta={<StatusBadge tone="warning">{issueLabel}</StatusBadge>}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      <FormSection title="Issues">
        {conflicts.length > 0 ? (
          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="rounded-xl border border-border bg-muted/20 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">{conflict.staff}</div>
                  <StatusBadge tone="warning">Needs review</StatusBadge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {conflict.day} · {conflict.detail}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{conflict.guidance}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No visible conflicts in this rota.</p>
        )}
      </FormSection>
      <p className="text-[11px] text-muted-foreground">
        Resolve conflicts before publishing. Working time checks are shown separately.
      </p>
    </DrawerShell>
  );
}
