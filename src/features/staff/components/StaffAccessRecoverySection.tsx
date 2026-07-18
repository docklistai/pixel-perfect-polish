import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { ActionButton, FormRow, FormSection } from "@/components/dl";
import { resetStaffPortalAccessFn } from "../api/issuePortalCode";
import type { IssuePortalCodeResult, StaffRow } from "../types";
import { PortalCodeResult } from "./PortalCodeResult";

interface StaffAccessRecoverySectionProps {
  open: boolean;
  staff: StaffRow[];
  enabled: boolean;
}

export function StaffAccessRecoverySection({
  open,
  staff,
  enabled,
}: StaffAccessRecoverySectionProps) {
  const [staffId, setStaffId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [validationError, setValidationError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<IssuePortalCodeResult | null>(null);
  const eligibleStaff = staff.filter(
    (row) => row.active !== false && row.portalStatus === "Claimed",
  );

  React.useEffect(() => {
    if (!open) {
      setStaffId("");
      setReason("");
      setValidationError("");
      setResult(null);
    }
  }, [open]);

  const resetAccess = async () => {
    const cleanReason = reason.trim();
    if (!staffId || !cleanReason) {
      setValidationError("Choose an active staff member and add a reason for the reset.");
      return;
    }
    setLoading(true);
    setResult(null);
    setValidationError("");
    try {
      setResult(
        await resetStaffPortalAccessFn({ data: { staffMemberId: staffId, reason: cleanReason } }),
      );
    } catch {
      setResult({ ok: false, message: "Something went wrong on our end. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormSection title="Reset claimed staff access">
      <p className="text-xs text-muted-foreground">
        Issue a 24-hour, one-time reset code after verifying the staff member. When they complete
        the reset on the new device, their old device immediately loses staff access. Their staff
        record, shifts, leave and time history stay unchanged.
      </p>
      {validationError && (
        <p id="staff-access-reset-error" role="alert" className="text-xs text-danger">
          {validationError}
        </p>
      )}
      <FormRow label="Staff member" htmlFor="reset-staff-select">
        <select
          id="reset-staff-select"
          value={staffId}
          required
          aria-invalid={Boolean(validationError && !staffId)}
          aria-describedby={validationError ? "staff-access-reset-error" : undefined}
          onChange={(event) => {
            setStaffId(event.target.value);
            setValidationError("");
            setResult(null);
          }}
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">Select claimed staff access…</option>
          {eligibleStaff.map((row) => (
            <option key={row.id} value={row.id}>
              {row.n} — {row.role}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Reason" htmlFor="staff-access-reset-reason">
        <textarea
          id="staff-access-reset-reason"
          value={reason}
          required
          maxLength={500}
          rows={2}
          aria-invalid={Boolean(validationError && !reason.trim())}
          aria-describedby={validationError ? "staff-access-reset-error" : undefined}
          onChange={(event) => {
            setReason(event.target.value);
            setValidationError("");
            setResult(null);
          }}
          placeholder="For example: replacement phone verified by manager"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </FormRow>
      <ActionButton
        icon={KeyRound}
        onClick={resetAccess}
        disabled={!enabled || loading || eligibleStaff.length === 0}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Issue reset code"}
      </ActionButton>
      {enabled && eligibleStaff.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No active claimed staff access can be reset.
        </p>
      )}
      <PortalCodeResult result={result} />
    </FormSection>
  );
}
