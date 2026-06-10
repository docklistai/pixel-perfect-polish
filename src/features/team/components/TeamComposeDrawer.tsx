import { Info } from "lucide-react";
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
      description="Share an update with your team"
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
      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        Preview before publishing — staff see this update in the app only after you publish it.
      </div>
      <FormSection title="Message">
        <FormRow label="Subject" required>
          <input
            placeholder="Short, clear subject line…"
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </FormRow>
        <FormRow label="Body" required>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Write your announcement here. Keep it short and direct — staff read these on their phones."
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
            <option>Bar (5)</option>
            <option>Events (3)</option>
            <option>Managers only (4)</option>
          </select>
        </FormRow>
      </FormSection>
      <FormSection title="Options">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 rounded" />
            <div>
              <div className="text-sm font-semibold">Pin to top</div>
              <div className="text-xs text-muted-foreground">Until manually removed</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded" />
            <div>
              <div className="text-sm font-semibold">Require acknowledgement</div>
              <div className="text-xs text-muted-foreground">Staff confirm they've read this</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded" />
            <div>
              <div className="text-sm font-semibold">Highlight in the staff app feed</div>
              <div className="text-xs text-muted-foreground">
                Appears at the top of the staff feed after publishing
              </div>
            </div>
          </label>
        </div>
      </FormSection>
    </DrawerShell>
  );
}
