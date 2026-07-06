import { UserPlus } from "lucide-react";
import { ActionButton, FormSection } from "@/components/dl";
import type { RotaRecoveryOption } from "../lib/rotaRecoveryOptions";
import { NO_SAFE_RECOVERY_OPTIONS } from "../lib/rotaRecoveryOptions";

export function ShiftRecoveryOptionsSection({
  options,
  onUse,
}: {
  options: RotaRecoveryOption[];
  onUse: (staffId: string) => void;
}) {
  return (
    <FormSection title="Recovery options">
      {options.length > 0 ? (
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={option.staffId}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/25 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{option.staffName}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{option.note}</div>
              </div>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={UserPlus}
                onClick={() => onUse(option.staffId)}
              >
                Use
              </ActionButton>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{NO_SAFE_RECOVERY_OPTIONS}</p>
      )}
      <p className="text-[11px] text-muted-foreground">
        This fills the assignment field only. Save is still required.
      </p>
    </FormSection>
  );
}
