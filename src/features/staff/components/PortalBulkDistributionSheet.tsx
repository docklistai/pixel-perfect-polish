import * as React from "react";
import { Copy, Check, Printer, ArrowLeft } from "lucide-react";
import { ActionButton } from "@/components/dl";
import type { BulkIssuedPortalCode } from "../types";

interface PortalBulkDistributionSheetProps {
  codes: BulkIssuedPortalCode[];
  workspaceCode?: string | null;
  onReset: () => void;
}

export function PortalBulkDistributionSheet({
  codes,
  workspaceCode,
  onReset,
}: PortalBulkDistributionSheetProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const lines = [
      "DOCKLIST STAFF PORTAL — ACCESS CODE DISTRIBUTION SHEET",
      workspaceCode ? `Workspace Code: ${workspaceCode}` : "",
      "",
      "Staff Member\tRole\tPersonal Code\tExpires",
      ...codes.map(
        (c) =>
          `${c.displayName}\t${c.roleName}\t${c.accessCode}\t${new Date(c.expiresAt).toLocaleDateString()}`,
      ),
      "",
      "Instructions: Navigate to /portal/access and enter your Workspace code and Personal code.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to access codes
        </button>
        <div className="flex items-center gap-2">
          <ActionButton
            size="sm"
            variant="secondary"
            icon={copied ? Check : Copy}
            onClick={handleCopy}
          >
            {copied ? "Copied sheet" : "Copy sheet"}
          </ActionButton>
          <ActionButton size="sm" variant="secondary" icon={Printer} onClick={handlePrint}>
            Print
          </ActionButton>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] p-3 text-xs text-[var(--st-teal-ink)]">
        <p className="font-semibold">Codes are revealed once only</p>
        <p className="mt-0.5 text-[11px] opacity-90">
          Personal access codes are bearer credentials valid for 14 days. Copy or print this sheet
          to distribute codes to your team.
        </p>
      </div>

      {workspaceCode && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
          <div>
            <div className="text-xs font-semibold">Workspace code</div>
            <div className="text-[11px] text-muted-foreground">Shared by all staff at login</div>
          </div>
          <code className="font-mono text-base font-semibold tracking-widest text-foreground">
            {workspaceCode}
          </code>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 px-3">Staff member</th>
              <th className="py-2.5 px-3">Role</th>
              {workspaceCode && <th className="py-2.5 px-3">Workspace code</th>}
              <th className="py-2.5 px-3">Personal code</th>
              <th className="py-2.5 px-3">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y border-border/60">
            {codes.map((c) => (
              <tr key={c.staffMemberId} className="hover:bg-muted/20">
                <td className="py-2.5 px-3 font-medium text-foreground">{c.displayName}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{c.roleName}</td>
                {workspaceCode && (
                  <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">
                    {workspaceCode}
                  </td>
                )}
                <td className="py-2.5 px-3">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-brand">
                    {c.accessCode}
                  </code>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                  {new Date(c.expiresAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
