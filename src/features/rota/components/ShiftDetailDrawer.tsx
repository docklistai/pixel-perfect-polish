import { DrawerShell, FormSection, DetailRow, StatusBadge, ActionButton } from "@/components/dl";
import type { ShiftDetail } from "../types";

export function ShiftDetailDrawer({
  shiftDetail,
  onClose,
}: {
  shiftDetail: ShiftDetail | null;
  onClose: () => void;
}) {
  return (
    <DrawerShell
      open={!!shiftDetail}
      onOpenChange={(o) => !o && onClose()}
      title={shiftDetail?.staff ?? "Shift"}
      description={shiftDetail ? `${shiftDetail.day} · ${shiftDetail.role}` : undefined}
      meta={
        shiftDetail?.flag === "conflict" ? (
          <StatusBadge tone="warning">Conflict</StatusBadge>
        ) : shiftDetail?.flag === "open" ? (
          <StatusBadge tone="info">Open shift</StatusBadge>
        ) : (
          <StatusBadge tone="success">Scheduled</StatusBadge>
        )
      }
      footer={<ActionButton onClick={onClose}>Close</ActionButton>}
    >
      <FormSection title="Shift details">
        <dl className="divide-y divide-border">
          <DetailRow label="Assigned to" value={shiftDetail?.staff ?? "—"} />
          <DetailRow label="Role" value={shiftDetail?.role ?? "—"} />
          <DetailRow label="Day" value={shiftDetail?.day ?? "—"} />
          <DetailRow label="Time" value={shiftDetail?.time ?? "—"} />
          <DetailRow
            label="Status"
            value={
              shiftDetail?.flag === "conflict"
                ? "Conflict — needs review"
                : shiftDetail?.flag === "open"
                  ? "Open — unassigned"
                  : "Scheduled"
            }
          />
        </dl>
      </FormSection>
    </DrawerShell>
  );
}
