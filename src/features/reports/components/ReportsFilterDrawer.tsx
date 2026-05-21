import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportsFilterDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Filter reports"
      description="Refine the data shown in this report."
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Reset
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Done</ActionButton>
        </>
      }
    >
      <FormSection title="Filters">
        <FormRow label="Department">
          <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
            <option>All</option>
            <option>Front of House</option>
            <option>Kitchen</option>
          </select>
        </FormRow>
        <FormRow label="Date range">
          <input
            type="date"
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
