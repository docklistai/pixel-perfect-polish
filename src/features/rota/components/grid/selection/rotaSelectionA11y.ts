/**
 * Spoken text for rota grid selection.
 *
 * A single-cell selection announces nothing here: moving focus already makes the
 * screen reader read that cell's own accessible name, and repeating it from a
 * live region would double-speak every arrow press. Only a range — something the
 * cell label cannot convey — is announced.
 */

export type RotaSelectionAnnouncementInput = {
  /** Selected rows that belong to a staff member. */
  staffRowCount: number;
  /** True when the open-shift row is inside the rectangle. */
  includesOpenRow: boolean;
  dayCount: number;
  cellCount: number;
  shiftCount: number;
};

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function rowsPhrase(staffRowCount: number, includesOpenRow: boolean): string {
  const staffPhrase = staffRowCount === 1 ? "1 staff member" : `${staffRowCount} staff`;
  if (!includesOpenRow) return staffPhrase;
  if (staffRowCount === 0) return "open shifts";
  return `${staffPhrase} and open shifts`;
}

export function buildRotaSelectionAnnouncement(input: RotaSelectionAnnouncementInput): string {
  if (input.cellCount <= 1) return "";
  return (
    `Selected ${rowsPhrase(input.staffRowCount, input.includesOpenRow)} ` +
    `by ${plural(input.dayCount, "day", "days")}. ` +
    `${plural(input.cellCount, "cell", "cells")}, ${plural(input.shiftCount, "shift", "shifts")}.`
  );
}

export function buildRotaCopyAnnouncement(cellCount: number, shiftCount: number): string {
  return `Copied ${plural(cellCount, "cell", "cells")}, ${plural(shiftCount, "shift", "shifts")}.`;
}
