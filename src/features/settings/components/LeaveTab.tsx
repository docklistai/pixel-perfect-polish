import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, AlertCard } from "@/components/dl";
import { SectionCard, FieldLabel, TextField, SelectField, PreviewTag } from "./SettingsPrimitives";
import { LEAVE_YEAR_MONTH_OPTIONS } from "@/features/leave/lib/leaveYear";
import { useLeavePolicy, useSaveLeavePolicy } from "../hooks/useLeavePolicy";
import {
  buildLeavePolicyPayload,
  leavePolicyFieldsFrom,
  type LeavePolicyFields,
} from "../lib/leavePolicyFields";

/**
 * Workspace leave policy: the month the leave year starts and the default
 * annual entitlement, both stated by the manager.
 *
 * The copy here carries the two honesty commitments the whole feature rests on:
 * Docklist records a stated figure rather than calculating a statutory one, and
 * it counts calendar dates rather than working days.
 */
export function LeaveTab() {
  const live = useLeavePolicy();
  const save = useSaveLeavePolicy();
  const [fields, setFields] = React.useState<LeavePolicyFields | null>(null);

  const editable = live.enabled && !live.isLoading && !live.isError;
  const fieldValues = fields ?? leavePolicyFieldsFrom(live.policy);
  const hasLeaveYear = fieldValues.leaveYearStartMonth !== "";

  const setField = (key: keyof LeavePolicyFields) => (value: string) => {
    setFields({ ...fieldValues, [key]: value });
  };

  const handleSave = async () => {
    const parsed = buildLeavePolicyPayload(fieldValues);
    if (!parsed.ok) {
      toast.error("Check leave policy", { description: parsed.message });
      return;
    }
    try {
      await save.mutateAsync(parsed.payload);
      setFields(null);
      toast.success("Leave policy saved", {
        description: "Balances now use this leave year. Existing records are unchanged.",
      });
    } catch {
      toast.error("Leave policy not saved", {
        description: "The save didn't reach your workspace. Try again.",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Leave</h2>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          The leave year and default entitlement this workspace works to. Docklist records the
          figures you enter — it does not calculate statutory or contractual entitlement.
        </p>
      </div>

      <SectionCard
        title="Leave year and entitlement"
        badge={
          live.enabled ? (
            <PreviewTag>Live — drives leave balances</PreviewTag>
          ) : (
            <PreviewTag>Preview in demo mode</PreviewTag>
          )
        }
        description="Balances are counted in calendar days. Docklist counts calendar dates inside leave requests; it does not know an individual's working pattern, so it does not calculate contractual working-day entitlement."
      >
        {live.isError && (
          <AlertCard
            className="mb-3"
            tone="warning"
            title="Leave policy couldn't be loaded"
            description="Refresh to try again. Saving is disabled until the current values load."
          />
        )}
        {editable && !hasLeaveYear && fields === null && (
          <AlertCard
            className="mb-3"
            tone="info"
            title="No leave year set yet"
            description="Choose the month your leave year starts. Until then, leave balances stay unavailable across Docklist."
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <FieldLabel>Leave year starts</FieldLabel>
            <SelectField
              value={fieldValues.leaveYearStartMonth}
              disabled={!editable}
              onChange={(event) => setField("leaveYearStartMonth")(event.target.value)}
            >
              <option value="">Not set</option>
              {LEAVE_YEAR_MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={String(month.value)}>
                  {month.label}
                </option>
              ))}
            </SelectField>
          </label>

          <label className="space-y-1.5">
            <FieldLabel>Default annual leave</FieldLabel>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <TextField
                value={fieldValues.defaultAnnualLeaveDays}
                inputMode="numeric"
                placeholder="Not set"
                disabled={!editable}
                aria-label="Default annual leave in calendar days"
                className="rounded-none border-0"
                onChange={(event) => setField("defaultAnnualLeaveDays")(event.target.value)}
              />
              <span className="flex shrink-0 items-center bg-muted px-3 text-xs font-semibold text-muted-foreground">
                calendar days
              </span>
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-xs leading-5 text-muted-foreground">
            The default is a starting point when you record someone&apos;s entitlement on their
            profile — it is never applied on its own. Someone with no recorded entitlement shows as
            &ldquo;not recorded&rdquo; rather than taking this figure. Changing the leave year does
            not rewrite entitlements already recorded against earlier years.
          </p>
          <ActionButton
            onClick={() => void handleSave()}
            disabled={!editable || save.isPending || fields === null}
          >
            {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {save.isPending ? "Saving…" : "Save leave policy"}
          </ActionButton>
        </div>
      </SectionCard>
    </div>
  );
}
