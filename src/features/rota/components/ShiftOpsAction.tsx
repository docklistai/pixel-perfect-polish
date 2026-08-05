import { ClipboardPlus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ActionButton } from "@/components/dl";
import type { DraftShift } from "../types";

export function ShiftOpsAction(props: {
  shift: DraftShift;
  rotaWeekId: string | null;
  locationId: string | null;
}) {
  const navigate = useNavigate();
  if (!props.rotaWeekId || !props.locationId) return null;
  return (
    <ActionButton
      variant="outline"
      size="sm"
      icon={ClipboardPlus}
      onClick={() =>
        navigate({
          to: "/ops",
          search: {
            create: true,
            locationId: props.locationId!,
            rotaWeekId: props.rotaWeekId!,
            shiftId: props.shift.id,
            staffMemberId: props.shift.staffId ?? undefined,
            departmentId: props.shift.departmentId ?? undefined,
          },
        })
      }
    >
      Log Ops item
    </ActionButton>
  );
}
