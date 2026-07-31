import type { ParseDiagnostic } from "./parseDiagnostics";
import type { DateOrder } from "./explicitDateFormat";
import type { DepartmentCandidate, StaffCandidate } from "./exactResolvers";
import type { ShiftSignature } from "@/features/rota/lib/scheduling/shiftSignature";
import type { MappedColumn } from "./headedColumnMap";

/** The contract of a headed schedule import: what goes in, what comes back. */

export type HeadedImportOptions = {
  /** Declared by the manager. ISO is always accepted regardless. */
  dateOrder: DateOrder;
  /** The seven dates of the target week, used to reject out-of-week rows. */
  weekIsoDates: readonly string[];
  locationId: string;
  staff: readonly StaffCandidate[];
  departments: readonly DepartmentCandidate[];
  defaultDepartmentId: string;
  defaultBreakMinutes?: number;
  /** Signature keys already in the week, for duplicate analysis. */
  existingSignatureKeys?: ReadonlySet<string>;
};

export type ImportedShift = {
  signature: ShiftSignature;
  roleName: string;
  staffId: string | null;
};

export type ImportedShiftRow = {
  /** 1-based data row, excluding the header. */
  row: number;
  cells: Record<string, string>;
  ok: boolean;
  diagnostics: ParseDiagnostic[];
  shift?: ImportedShift;
};

export type HeadedScheduleImportResult = {
  ok: boolean;
  diagnostics: ParseDiagnostic[];
  columns: MappedColumn[];
  rows: ImportedShiftRow[];
  validCount: number;
  errorCount: number;
  duplicatesInFile: number;
  duplicatesOfExisting: number;
};
