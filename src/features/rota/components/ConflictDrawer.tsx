import { DrawerShell, FormSection, DetailRow, StatusBadge, ActionButton } from "@/components/dl";
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
          <dl className="divide-y divide-border">
            {conflicts.map((conflict) => (
              <DetailRow
                key={`${conflict.staff}-${conflict.day}-${conflict.detail}`}
                label={conflict.staff}
                value={`${conflict.day} · ${conflict.detail}`}
              />
            ))}
          </dl>
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
