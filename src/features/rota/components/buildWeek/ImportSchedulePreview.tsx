import { AlertTriangle, Info } from "lucide-react";
import { FormSection } from "@/components/dl";
import {
  operationCountLabel,
  previewRows,
  type ImportDrawerState,
} from "./importScheduleDrawerState";

/**
 * The review section of the import drawer.
 *
 * Every source row the manager pasted is listed here, valid or not, and anything
 * that will not be imported carries the reason it was refused. Showing only the
 * good rows would make a partial import look like a complete one.
 */
export function ImportSchedulePreview({ state }: { state: ImportDrawerState }) {
  const preview = state.result?.preview;
  if (!preview) return null;
  const rows = previewRows(state);
  const result = state.result;
  const overLimit = preview.operationCount > preview.operationLimit;

  return (
    <FormSection
      // The count is stated against the limit, always — a paste over the ceiling
      // must never read as "ready" when the apply would refuse it outright.
      title={`3. Review — ${operationCountLabel(state)}`}
      description={`${preview.validCount} rows will be imported and ${preview.errorCount} will be left out. Every row you pasted is listed, and anything that will not be imported says why.`}
    >
      {overLimit && (
        <p
          role="alert"
          className="mb-2 rounded-lg border border-danger/30 bg-danger-soft/30 p-2 text-xs"
        >
          An import writes at most {preview.operationLimit} shifts in one go, and this paste has{" "}
          {preview.operationCount}. Nothing can be imported until it is split into smaller pastes.
        </p>
      )}
      {preview.diagnostics.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {preview.diagnostics.map((entry, index) => (
            <li
              key={`${entry.code}-${index}`}
              className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2 text-xs"
            >
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span className="text-muted-foreground">{entry.message}</span>
            </li>
          ))}
        </ul>
      )}
      {(preview.duplicatesInFile > 0 || preview.duplicatesOfExisting > 0) && (
        <p className="mb-2 text-xs text-muted-foreground">
          {preview.duplicatesInFile} repeated within the paste, {preview.duplicatesOfExisting}{" "}
          already in this week. Identical shifts are allowed, so these are imported as extra shifts
          rather than skipped.
        </p>
      )}
      <ul className="flex flex-col gap-1.5 text-sm">
        {rows.map((row) => (
          <li
            key={row.row}
            className={`rounded-lg border p-2 ${
              row.ok ? "border-border bg-muted/25" : "border-danger/30 bg-danger-soft/30"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {!row.ok && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" aria-hidden />}
              Row {row.row}
              {row.shift && (
                <span className="font-normal text-muted-foreground">
                  · {row.shift.roleName} · {row.shift.signature.workDate}{" "}
                  {row.shift.signature.startLocal}–{row.shift.signature.endLocal}
                  {row.shift.signature.overnight ? " (overnight)" : ""}
                  {row.shift.staffId === null ? " · open" : ""}
                </span>
              )}
            </div>
            {row.diagnostics.map((entry, index) => (
              <p key={index} className="mt-0.5 text-[11px] text-muted-foreground">
                {entry.message}
              </p>
            ))}
          </li>
        ))}
      </ul>
      {result?.ok && result.operations.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Importing writes all {result.operations.length} shifts at once, or none of them. Your undo
          history is cleared afterwards — you can still edit every shift by hand.
        </p>
      )}
    </FormSection>
  );
}
