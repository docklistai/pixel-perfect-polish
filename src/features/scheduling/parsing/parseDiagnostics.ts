/**
 * One vocabulary for everything a parser can find wrong.
 *
 * The rule this exists to enforce is simple: **no row and no field is ever
 * dropped without a diagnostic**. A parser may refuse input, and it may skip a
 * row, but it may never do either silently. Anything a manager pasted that does
 * not end up written has to be explainable back to them, positioned to the exact
 * row and column it came from.
 */

export type ParseSeverity = "error" | "warning";

export type ParseDiagnosticCode =
  /** Quoting the reader cannot resolve without guessing. */
  | "malformed-quote"
  /** Rows are not the same width and the missing columns are contested. */
  | "ragged-row"
  | "empty-input"
  | "no-content"
  /** A header column that does not map to anything this importer understands. */
  | "unknown-column"
  | "missing-required-column"
  | "missing-required-value"
  | "invalid-value"
  /** A date whose format cannot be known without being told. */
  | "ambiguous-date"
  /** Text that matched nothing. */
  | "unresolved-reference"
  /** Text that matched more than one thing, so picking one would be a guess. */
  | "ambiguous-reference"
  /** The same row appears twice in this input. */
  | "duplicate-in-input"
  /** This row already exists in the rota. */
  | "duplicate-of-existing";

export type ParseDiagnostic = {
  code: ParseDiagnosticCode;
  severity: ParseSeverity;
  /** Plain-English, safe to show a manager. */
  message: string;
  /** 1-based source row, when the problem belongs to one. */
  row?: number;
  /** 1-based source column, when the problem belongs to one. */
  column?: number;
  /** The column's header text, when the input was headed. */
  field?: string;
};

export function diagnostic(
  code: ParseDiagnosticCode,
  severity: ParseSeverity,
  message: string,
  position: { row?: number; column?: number; field?: string } = {},
): ParseDiagnostic {
  return { code, severity, message, ...position };
}

export function errorDiagnostic(
  code: ParseDiagnosticCode,
  message: string,
  position?: { row?: number; column?: number; field?: string },
): ParseDiagnostic {
  return diagnostic(code, "error", message, position);
}

export function warningDiagnostic(
  code: ParseDiagnosticCode,
  message: string,
  position?: { row?: number; column?: number; field?: string },
): ParseDiagnostic {
  return diagnostic(code, "warning", message, position);
}

export function hasErrors(diagnostics: readonly ParseDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}

/** Human position prefix — "Row 3, column 2" — for messages that need one. */
export function describePosition(diagnostic: ParseDiagnostic): string {
  const parts: string[] = [];
  if (diagnostic.row !== undefined) parts.push(`row ${diagnostic.row}`);
  if (diagnostic.field) parts.push(`column "${diagnostic.field}"`);
  else if (diagnostic.column !== undefined) parts.push(`column ${diagnostic.column}`);
  if (parts.length === 0) return "";
  return parts.join(", ").replace(/^./, (char) => char.toUpperCase());
}
