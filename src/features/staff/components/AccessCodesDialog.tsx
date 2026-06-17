import * as React from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { ActionButton, DialogShell, FormRow, FormSection } from "@/components/dl";
import { issueStaffPortalCodeFn, issueWorkspacePortalCodeFn } from "../api/issuePortalCode";
import type { IssuePortalCodeResult, StaffRow } from "../types";

interface AccessCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffRow[];
  /** Live roster issuance is real; the demo seed cannot back real codes. */
  source: "live" | "demo";
}

/** Reveal-once display of a freshly issued plaintext code, with copy-to-clipboard. */
function CodeReveal({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <code className="flex-1 select-all font-mono text-base font-semibold tracking-[0.18em] text-[var(--st-teal-ink)]">
          {code}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--st-teal-line)] px-2.5 text-xs font-semibold text-[var(--st-teal-ink)] transition-colors hover:bg-background/40"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--st-teal-ink)]/80">
        Shown once — copy it now. Issuing again replaces it.
      </p>
    </div>
  );
}

function ResultArea({ result }: { result: IssuePortalCodeResult | null }) {
  if (!result) return null;
  if (result.ok) return <CodeReveal code={result.code} />;
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
      {result.message}
    </div>
  );
}

export function AccessCodesDialog({ open, onOpenChange, staff, source }: AccessCodesDialogProps) {
  const [wsLoading, setWsLoading] = React.useState(false);
  const [wsResult, setWsResult] = React.useState<IssuePortalCodeResult | null>(null);
  const [staffId, setStaffId] = React.useState("");
  const [staffLoading, setStaffLoading] = React.useState(false);
  const [staffResult, setStaffResult] = React.useState<IssuePortalCodeResult | null>(null);

  React.useEffect(() => {
    if (!open) {
      setWsResult(null);
      setStaffResult(null);
      setStaffId("");
    }
  }, [open]);

  const issueWorkspace = async () => {
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
    if (!staffId) return;
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
          <ActionButton icon={KeyRound} onClick={issueWorkspace} disabled={wsLoading}>
            {wsLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : wsResult?.ok ? (
              "Rotate workspace code"
            ) : (
              "Issue workspace code"
            )}
          </ActionButton>
          <ResultArea result={wsResult} />
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
          <ActionButton icon={KeyRound} onClick={issueStaff} disabled={staffLoading || !staffId}>
            {staffLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Issue personal code"
            )}
          </ActionButton>
          <ResultArea result={staffResult} />
        </FormSection>
      </div>
    </DialogShell>
  );
}
