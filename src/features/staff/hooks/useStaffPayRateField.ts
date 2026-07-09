import * as React from "react";
import { useSaveStaffPayRate, useStaffPayRates } from "./useStaffPayRates";
import { formatPayRatePounds, parsePayRateInput } from "../lib/staffPayRate";

export type StaffPayRateField = {
  /** True when live rates are available for the active manager workspace. */
  enabled: boolean;
  /** Current input value (pounds), prefilled from the recorded rate. */
  value: string;
  onChange: (value: string) => void;
  /**
   * Persists the rate if the field was touched. Returns ok:false with a
   * message when the input doesn't parse; the caller surfaces it inline.
   */
  submit: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

/**
 * Self-contained pay-rate field state for the edit-staff dialog. Untouched
 * fields never write, so opening and saving the dialog does not create or
 * clear rate rows as a side effect.
 */
export function useStaffPayRateField(staffMemberId: string, open: boolean): StaffPayRateField {
  const { rates, enabled } = useStaffPayRates();
  const save = useSaveStaffPayRate();
  const [draft, setDraft] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setDraft(null);
  }, [open, staffMemberId]);

  const recorded = rates[staffMemberId];
  const value = draft ?? formatPayRatePounds(recorded);

  const submit = React.useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (!enabled || draft === null) return { ok: true };
    const parsed = parsePayRateInput(draft);
    if (!parsed.ok) return parsed;
    if (parsed.pence === (recorded ?? null)) return { ok: true };
    try {
      await save.mutateAsync({ staffMemberId, hourlyRatePence: parsed.pence });
      return { ok: true };
    } catch {
      return { ok: false, message: "The hourly rate didn't save. Try again." };
    }
  }, [draft, enabled, recorded, save, staffMemberId]);

  return { enabled, value, onChange: setDraft, submit };
}
