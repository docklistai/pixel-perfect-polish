import * as React from "react";
import { setStaffBirthdayFn } from "../api/setStaffBirthday";
import { birthdayChanged, parseBirthday, type BirthdayValue } from "../lib/staffBirthday";
import type { StaffRow } from "../types";

export type StaffBirthdayField = {
  value: BirthdayValue;
  setDay: (day: string) => void;
  setMonth: (month: string) => void;
  /**
   * Persists only when the pair was touched AND differs from what is stored, so
   * opening and saving the dialog never rewrites or clears a birthday as a side
   * effect. Returns ok:false with an inline message on invalid input.
   */
  submit: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

function storedValue(member: StaffRow): BirthdayValue {
  return {
    day: member.birthDay != null ? String(member.birthDay) : "",
    month: member.birthMonth != null ? String(member.birthMonth) : "",
  };
}

export function useStaffBirthdayField(member: StaffRow, open: boolean): StaffBirthdayField {
  const [draft, setDraft] = React.useState<BirthdayValue | null>(null);

  React.useEffect(() => {
    if (open) setDraft(null);
  }, [open, member.id]);

  const value = draft ?? storedValue(member);

  const submit = React.useCallback(async (): Promise<
    { ok: true } | { ok: false; message: string }
  > => {
    if (draft === null) return { ok: true };
    const parsed = parseBirthday(draft);
    if (!parsed.ok) return { ok: false, message: parsed.message };
    if (!birthdayChanged(parsed, member.birthDay, member.birthMonth)) return { ok: true };
    try {
      return await setStaffBirthdayFn({
        data: {
          staffMemberId: member.id,
          birthDay: parsed.day,
          birthMonth: parsed.month,
        },
      });
    } catch {
      return { ok: false, message: "The birthday didn't save. Try again." };
    }
  }, [draft, member.birthDay, member.birthMonth, member.id]);

  return {
    value,
    setDay: (day: string) => setDraft((prev) => ({ ...(prev ?? storedValue(member)), day })),
    setMonth: (month: string) => setDraft((prev) => ({ ...(prev ?? storedValue(member)), month })),
    submit,
  };
}
