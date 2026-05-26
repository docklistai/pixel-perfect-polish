import { DetailRow } from "@/components/dl";
import { SectionCard, ToggleRow } from "./SettingsPrimitives";

export function LeavePoliciesTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Leave policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manager-only policy preview for approvals and visibility.
        </p>
      </div>

      <SectionCard
        title="Approval rules"
        description="What the manager should review before leave is marked final."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Approve leave before publishing"
            description="Leave requests remain in draft until a manager reviews them."
            ariaLabel="Approve leave before publishing"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show leave clashes in rota"
            description="Display a warning when leave overlaps an open shift."
            ariaLabel="Show leave clashes in rota"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard title="Policy notes" description="Short, honest copy for the preview.">
        <div className="space-y-2">
          <DetailRow label="Carry over" value="Preview only" />
          <DetailRow label="Blackout dates" value="Shown in manager view" />
          <DetailRow label="Approval chain" value="Manager or owner" />
        </div>
      </SectionCard>

      <SectionCard
        title="Leave summary"
        description="A quick read on how the local preview should behave."
      >
        <div className="space-y-2">
          <DetailRow label="Visible in preview" value="Leave requests" />
          <DetailRow label="Shared with staff" value="Approved leave only" />
          <DetailRow label="Dirty state" value="Local only" />
        </div>
      </SectionCard>
    </div>
  );
}
