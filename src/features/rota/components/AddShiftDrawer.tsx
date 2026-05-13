import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import type { StaffMember } from "../types";

type Day = { d: string };

export function AddShiftDrawer({
  open,
  onOpenChange,
  days,
  staff,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  days: Day[];
  staff: StaffMember[];
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add shift"
      description="Create a new shift on the rota."
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Add to rota</ActionButton>
        </>
      }
    >
      <FormSection title="Shift">
        <FormRow label="Day" required>
          <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
            {days.map((d) => (
              <option key={d.d}>{d.d}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Role" required>
          <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
            <option>Front of House</option>
            <option>Bar</option>
            <option>Kitchen</option>
            <option>Housekeeping</option>
          </select>
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Start" required>
            <input
              type="time"
              defaultValue="17:00"
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
          <FormRow label="End" required>
            <input
              type="time"
              defaultValue="23:00"
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
        </div>
        <FormRow label="Assign to" hint="Leave blank to post as an open shift.">
          <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
            <option value="">Post as open shift</option>
            {staff.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} · {s.role}
              </option>
            ))}
          </select>
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
