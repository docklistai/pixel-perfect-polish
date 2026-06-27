import { CheckCircle2, CircleAlert } from "lucide-react";
import type { ParseBulkStaffResult } from "../lib/bulkStaff";

/** Read-only preview of parsed bulk-staff rows, with per-row validity + errors. */
export function BulkStaffPreviewTable({ result }: { result: ParseBulkStaffResult }) {
  if (result.rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No rows found. Paste at least one staff line.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs font-medium">
        <span className="text-success">{result.validCount} valid</span>
        {result.errorCount > 0 && (
          <span className="text-danger">{result.errorCount} with errors</span>
        )}
      </div>
      <div className="max-h-[260px] overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[var(--bg-raised)] text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Name</th>
              <th className="px-2 py-1.5 font-medium">Role</th>
              <th className="px-2 py-1.5 font-medium">Dept</th>
              <th className="px-2 py-1.5 font-medium">Contract</th>
              <th className="px-2 py-1.5 font-medium">Hrs</th>
              <th className="px-2 py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.line} className="border-t border-border/60 align-top">
                <td className="px-2 py-1.5 tabular-nums text-muted-foreground">{row.line}</td>
                <td className="px-2 py-1.5 font-medium">{row.preview.name || "—"}</td>
                <td className="px-2 py-1.5">{row.preview.role || "—"}</td>
                <td className="px-2 py-1.5">{row.preview.department}</td>
                <td className="px-2 py-1.5">{row.preview.contract}</td>
                <td className="px-2 py-1.5 tabular-nums">{row.preview.hours}</td>
                <td className="px-2 py-1.5">
                  {row.ok ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-start gap-1 text-danger">
                      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span>{row.errors.join(" ")}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
