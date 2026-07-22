import * as React from "react";
import { flushSync } from "react-dom";
import { buildPrintableRota, type PrintableRota } from "../print/printableRotaModel";
import type { DraftShift, StaffMember } from "../types";

/**
 * Builds the printable rota document and owns the Print action.
 *
 * Kept out of the route so `routes/rota.tsx` stays at its size target. Printing
 * only reads the current draft — it publishes and mutates nothing, and
 * cancelling the browser dialog leaves no trace.
 */
export function useRotaPrintDocument({
  workspaceName,
  locationName,
  weekLabel,
  dayLabels,
  staff,
  shifts,
  published,
  hasUnpublishedChanges,
  departmentNameById,
}: {
  workspaceName: string | null;
  locationName: string | null;
  weekLabel: string;
  dayLabels: string[];
  staff: StaffMember[];
  shifts: DraftShift[];
  published: boolean;
  hasUnpublishedChanges: boolean;
  departmentNameById?: Map<string, string>;
}): { model: PrintableRota; print: () => void } {
  const [printedAt, setPrintedAt] = React.useState(() => new Date());

  const model = React.useMemo(
    () =>
      buildPrintableRota({
        workspaceName,
        locationName,
        weekLabel,
        dayLabels,
        staff,
        shifts,
        published,
        hasUnpublishedChanges,
        printedAt,
        departmentNameById,
      }),
    [
      workspaceName,
      locationName,
      weekLabel,
      dayLabels,
      staff,
      shifts,
      published,
      hasUnpublishedChanges,
      printedAt,
      departmentNameById,
    ],
  );

  // Stamp the print time and commit it before the dialog opens, so the sheet
  // shows when it was actually printed.
  const print = React.useCallback(() => {
    flushSync(() => setPrintedAt(new Date()));
    window.print();
  }, []);

  return { model, print };
}
