import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { ActionButton, DialogShell, FeedbackBanner } from "@/components/dl";
import { createStaffMembersBulkFn } from "../api/createStaffMembersBulk";
import { useWorkspaceDepartments } from "../hooks/useWorkspaceDepartments";
import { BULK_STAFF_MAX_ROWS, parseBulkStaff, type ParseBulkStaffResult } from "../lib/bulkStaff";
import { describeStaffWriteError } from "../lib/addStaff";
import { BulkStaffPreviewTable } from "./BulkStaffPreviewTable";

interface BulkAddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live roster import is real; the demo seed cannot back real writes. */
  source: "live" | "demo";
}

const PLACEHOLDER = [
  "Ava Bennett, Waiter, Front of house, Part-time, 20, ava@example.com",
  "Ben Carter, Head Chef, Kitchen, Full-time, 40",
  "Chloe Davies, Bartender, Bar, Casual",
].join("\n");

interface ImportSummary {
  created: number;
  failed: number;
  failures: { line: number; name: string; message: string }[];
}

export function BulkAddStaffDialog({ open, onOpenChange, source }: BulkAddStaffDialogProps) {
  const queryClient = useQueryClient();
  const isDemo = source === "demo";
  const { departments, isLoading: departmentsLoading } = useWorkspaceDepartments({
    enabled: source === "live" && open,
  });

  const [text, setText] = React.useState("");
  const [parsed, setParsed] = React.useState<ParseBulkStaffResult | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);

  React.useEffect(() => {
    if (!open) {
      setText("");
      setParsed(null);
      setImporting(false);
      setSummary(null);
    }
  }, [open]);

  const preview = () => {
    setSummary(null);
    setParsed(parseBulkStaff(text, departments));
  };

  const validRows = parsed?.rows.filter((row) => row.ok) ?? [];
  const tooMany = validRows.length > BULK_STAFF_MAX_ROWS;
  const canImport =
    source === "live" && !departmentsLoading && !importing && validRows.length > 0 && !tooMany;

  async function handleImport() {
    if (!canImport) return;
    setImporting(true);
    setSummary(null);
    try {
      const result = await createStaffMembersBulkFn({
        data: validRows.map((row) => row.payload!),
      });
      if (!result.ok) {
        toast.error("Import failed", { description: result.message });
        return;
      }
      const failures = result.results
        .filter((r) => !r.ok)
        .map((r) => ({
          line: validRows[r.index]!.line,
          name: validRows[r.index]!.preview.name,
          message: r.message ?? describeStaffWriteError(null),
        }));
      setSummary({ created: result.created, failed: result.failed, failures });
      setParsed(null);
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["staff", "workspace-roster"] });
      if (result.created > 0) {
        toast.success(`${result.created} staff added`, {
          description:
            result.failed > 0
              ? `${result.failed} row(s) need attention.`
              : "Ready to schedule on the rota.",
        });
      } else {
        toast.error("No staff were added", { description: "Check the row errors and try again." });
      }
    } catch {
      toast.error("Import failed", { description: describeStaffWriteError(null) });
    } finally {
      setImporting(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk add staff"
      description="Paste a list of staff to add many at once. Existing single Add Staff still works."
      icon={Users}
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton size="sm" variant="secondary" onClick={preview} disabled={!text.trim()}>
            Preview rows
          </ActionButton>
          <ActionButton size="sm" onClick={handleImport} disabled={!canImport}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {importing ? "Importing…" : `Import ${validRows.length || ""} valid`.trim()}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        {isDemo && (
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2 text-xs text-muted-foreground">
            This roster is demo data. Real staff can only be added to a live workspace.
          </div>
        )}

        {summary && (
          <FeedbackBanner
            tone={summary.failed > 0 ? "warning" : "success"}
            title={`Added ${summary.created} of ${summary.created + summary.failed} staff`}
            description={
              summary.failures.length > 0
                ? summary.failures.map((f) => `Row ${f.line} (${f.name}): ${f.message}`).join(" · ")
                : "All pasted rows were added."
            }
          />
        )}

        <div className="space-y-1.5">
          <label htmlFor="bulk-staff-text" className="text-xs font-medium text-muted-foreground">
            One staff member per line: Name, Role, Department, Contract, Weekly hours, Email
          </label>
          <textarea
            id="bulk-staff-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={PLACEHOLDER}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Name and Role are required. Department must match an existing department (or leave it
            blank for Unassigned). Tabs or commas both work, so you can paste from a spreadsheet.
          </p>
        </div>

        {tooMany && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            That's more than {BULK_STAFF_MAX_ROWS} rows. Import in smaller batches.
          </div>
        )}

        {/* A paste that could not be decoded at all has no rows to preview, so
            the reason has to be shown here or it would vanish silently. */}
        {parsed?.readError && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-danger-soft/40 p-3 text-sm"
          >
            <div className="font-semibold">That paste could not be read</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{parsed.readError}</p>
          </div>
        )}
        {parsed && !parsed.readError && <BulkStaffPreviewTable result={parsed} />}
      </div>
    </DialogShell>
  );
}
