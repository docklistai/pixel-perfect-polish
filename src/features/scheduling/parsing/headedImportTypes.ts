import type { ParseDiagnostic } from "./parseDiagnostics";
import type { DateOrder } from "./explicitDateFormat";
import type { DepartmentCandidate, StaffCandidate } from "./exactResolvers";
import type { AvailabilityFacts } from "@/features/rota/lib/scheduling/eligibility";
import type { ShiftSignature } from "@/features/rota/lib/scheduling/shiftSignature";
import type { MappedColumn } from "./headedColumnMap";
import type { MatrixOrigin } from "./matrixLayout";

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
  /**
   * Role labels this workspace already uses, so an import joins the rota's own
   * spelling instead of introducing a second one.
   */
  knownRoleNames?: readonly string[];
  /**
   * Recorded absence for the week, from the same loader Build the Week reads.
   *
   * Present for the same reason `StaffCandidate.roleName` is: the apply boundary
   * refuses an assignment onto approved leave, and finding that out after
   * pressing Import means the whole paste is refused for one row. Omitted only
   * by callers that have no workspace behind them — parser unit tests — and an
   * omission means "no absence known", never "absence ignored", because the
   * server proposal loads it unconditionally and fails the preview if it cannot.
   */
  availability?: AvailabilityFacts;
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
  /**
   * Where this row came from when the input was a grid rather than a list.
   *
   * A matrix row is synthesised, so its row number describes a table the
   * manager never wrote. This carries the cell they DID write, so a refusal can
   * say "Row 4, Tue" instead of a number that means nothing to them.
   */
  source?: MatrixOrigin;
};

export type HeadedScheduleImportResult = {
  ok: boolean;
  diagnostics: ParseDiagnostic[];
  columns: MappedColumn[];
  /** How the input was read: a list of shifts, or a staff × day grid. */
  layout: "long" | "matrix";
  rows: ImportedShiftRow[];
  validCount: number;
  errorCount: number;
  duplicatesInFile: number;
  duplicatesOfExisting: number;
  /**
   * Operations this paste would generate, and the ceiling the apply enforces.
   *
   * Counted here rather than at apply time so a paste that is too large is
   * refused while the manager is still looking at it. One valid row is one
   * operation; invalid rows generate none.
   */
  operationCount: number;
  operationLimit: number;
};
