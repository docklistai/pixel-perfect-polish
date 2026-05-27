import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { TimelineEntry } from "../types";

interface OpsDetailDrawerProps {
  entry: TimelineEntry | null;
  onOpenChange: (open: boolean) => void;
}

export function OpsDetailDrawer({ entry, onOpenChange }: OpsDetailDrawerProps) {
  const priorityTone = entry?.prioTone === "danger" ? "danger" : "warning";

  return (
    <DrawerShell
      open={entry !== null}
      onOpenChange={onOpenChange}
      title={entry?.title ?? "Operations detail"}
      description={entry ? `${entry.t} · ${entry.area}` : "Operations timeline detail"}
      meta={entry?.prio ? <StatusBadge tone={priorityTone}>{entry.prio}</StatusBadge> : null}
      footer={<ActionButton onClick={() => onOpenChange(false)}>Close</ActionButton>}
    >
      {entry && (
        <FormSection title="Timeline entry">
          <dl className="divide-y divide-border">
            <DetailRow label="Time" value={entry.t} />
            <DetailRow label="Area" value={entry.area} />
            <DetailRow label="Status" value={entry.st} />
            <DetailRow label="Owner" value={entry.who?.n ?? entry.by ?? "Team"} />
          </dl>
        </FormSection>
      )}
    </DrawerShell>
  );
}
