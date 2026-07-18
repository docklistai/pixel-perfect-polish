import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { ActionButton, DialogShell, FormRow, FormSection } from "@/components/dl";
import { issueStaffPortalCodeFn, issueWorkspacePortalCodeFn } from "../api/issuePortalCode";
import { getStaffSurfaceCapabilities } from "../lib/staffSurfaceCapabilities";
import type { IssuePortalCodeResult, StaffRow } from "../types";
import { PortalCodeResult } from "./PortalCodeResult";
import { StaffAccessRecoverySection } from "./StaffAccessRecoverySection";

interface AccessCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffRow[];
  /** Live roster issuance is real; the demo seed cannot back real codes. */
  source: "live" | "demo";
}

export function AccessCodesDialog({ open, onOpenChange, staff, source }: AccessCodesDialogProps) {
  const [wsLoading, setWsLoading] = React.useState(false);
  const [wsResult, setWsResult] = React.useState<IssuePortalCodeResult | null>(null);
  const [staffId, setStaffId] = React.useState("");
  const [staffLoading, setStaffLoading] = React.useState(false);
  const [staffResult, setStaffResult] = React.useState<IssuePortalCodeResult | null>(null);
  const { canIssueAccessCodes } = getStaffSurfaceCapabilities(source);

  React.useEffect(() => {
    if (!open) {
      setWsResult(null);
      setStaffResult(null);
      setStaffId("");
    }
  }, [open]);

  const issueWorkspace = async () => {
    if (!canIssueAccessCodes) return;
    setWsLoading(true);
    setWsResult(null);
    try {
      setWsResult(await issueWorkspacePortalCodeFn());
    } catch {
      setWsResult({ ok: false, message: "Something went wrong on our end. Please try again." });
    } finally {
      setWsLoading(false);
    }
  };

  const issueStaff = async () => {
    if (!canIssueAccessCodes || !staffId) return;
    setStaffLoading(true);
    setStaffResult(null);
    try {
      setStaffResult(await issueStaffPortalCodeFn({ data: { staffMemberId: staffId } }));
    } catch {
      setStaffResult({ ok: false, message: "Something went wrong on our end. Please try again." });
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Portal access codes"
      description="Issue the codes a staff member redeems at /portal/access to open their portal."
      icon={KeyRound}
      size="lg"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Done
        </ActionButton>
      }
    >
      <div className="space-y-5">
        {source === "demo" && (
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2 text-xs text-muted-foreground">
            This roster is demo data. Real codes can only be issued against a live workspace roster.
          </div>
        )}

        <FormSection title="Workspace code">
          <p className="text-xs text-muted-foreground">
            One shared code for the whole workspace. Every staff member enters it alongside their
            own personal code.
          </p>
          <ActionButton
            icon={KeyRound}
            onClick={issueWorkspace}
            disabled={!canIssueAccessCodes || wsLoading}
          >
            {wsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : wsResult?.ok ? (
              "Rotate workspace code"
            ) : (
              "Issue workspace code"
            )}
          </ActionButton>
          <PortalCodeResult result={wsResult} />
        </FormSection>

        <FormSection title="Personal staff code">
          <p className="text-xs text-muted-foreground">
            A single-use code for one staff member. It can&apos;t be issued for someone who already
            has an account.
          </p>
          <FormRow label="Staff member" htmlFor="issue-staff-select">
            <select
              id="issue-staff-select"
              aria-label="Staff member"
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setStaffResult(null);
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">Select a staff member…</option>
              {staff.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.n} — {row.role}
                </option>
              ))}
            </select>
          </FormRow>
          <ActionButton
            icon={KeyRound}
            onClick={issueStaff}
            disabled={!canIssueAccessCodes || staffLoading || !staffId}
          >
            {staffLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Issue personal code"
            )}
          </ActionButton>
          <PortalCodeResult result={staffResult} />
        </FormSection>

        <StaffAccessRecoverySection open={open} staff={staff} enabled={canIssueAccessCodes} />
      </div>
    </DialogShell>
  );
}
