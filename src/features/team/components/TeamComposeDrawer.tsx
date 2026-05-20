import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import { TOTAL_STAFF } from "../data/teamDemoData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamComposeDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Compose announcement"
      description="Share an update with your team."
      width="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Save draft
          </ActionButton>
          <ActionButton onClick={() => onOpenChange(false)}>Publish</ActionButton>
        </>
      }
    >
      <FormSection title="Message">
        <FormRow label="Title" required>
          <input
            placeholder="e.g. Summer menu launch"
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </FormRow>
        <FormRow label="Body" required>
          <textarea
            className="w-full min-h-32 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="What would you like to share?"
          />
        </FormRow>
      </FormSection>
      <FormSection title="Audience">
        <FormRow label="Send to">
          <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand">
            <option>All staff ({TOTAL_STAFF})</option>
            <option>Front of House (12)</option>
            <option>Kitchen (9)</option>
            <option>Housekeeping (4)</option>
          </select>
        </FormRow>
      </FormSection>
    </DrawerShell>
  );
}
