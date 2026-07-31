import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import { detectDelimiter, normaliseRagged, type Delimiter } from "./delimitedShape";

/**
 * Quote-aware reader for tab- and comma-separated text.
 *
 * Generalised from the rota clipboard parser, which was already a correct state
 * machine — this adds a delimiter parameter and structured diagnostics so the
 * same decoding serves clipboard paste, headed schedule import and staff import.
 *
 * Spreadsheets quote any field containing the delimiter, a newline or a quote,
 * and double the inner quotes. Malformed quoting is refused rather than guessed
 * at: a field that looks like `"Smith, John` has no reading that is safe to
 * assume.
 *
 * The delimiter is chosen for the **whole document**, never per line. Choosing it
 * line by line is how a single stray tab could make one row split differently
 * from its neighbours.
 */

const QUOTE = '"';

// Re-exported so every existing caller keeps one import site. Choosing the
// delimiter and squaring ragged rows live in ./delimitedShape.
export { detectDelimiter, type Delimiter };

export type DelimitedReadResult =
  | { ok: true; rows: string[][]; delimiter: Delimiter; diagnostics: ParseDiagnostic[] }
  | { ok: false; diagnostics: ParseDiagnostic[] };

type FieldState = "start" | "plain" | "quoted" | "closed";

function quoteError(row: number, column: number, detail: string): ParseDiagnostic {
  return errorDiagnostic("malformed-quote", `Malformed quoted field: ${detail}`, {
    row: row + 1,
    column: column + 1,
  });
}

/** Strict state machine: quotes only ever delimit a whole field. */
function parseRows(text: string, delimiter: Delimiter): DelimitedReadResult {
  const rows: string[][] = [[]];
  let field = "";
  let state: FieldState = "start";
  let row = 0;
  let column = 0;

  const pushField = () => {
    rows[row]!.push(field);
    field = "";
    state = "start";
    column += 1;
  };
  const pushRow = () => {
    pushField();
    rows.push([]);
    row += 1;
    column = 0;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (state === "quoted") {
      if (char !== QUOTE) field += char;
      else if (text[i + 1] === QUOTE) {
        field += QUOTE;
        i += 1;
      } else state = "closed";
      continue;
    }
    if (state === "closed") {
      if (char === delimiter) pushField();
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        pushRow();
      } else {
        return {
          ok: false,
          diagnostics: [quoteError(row, column, "characters appear after a closed quoted field.")],
        };
      }
      continue;
    }
    if (char === QUOTE) {
      if (state !== "start") {
        return {
          ok: false,
          diagnostics: [quoteError(row, column, "a quote appears inside an unquoted field.")],
        };
      }
      state = "quoted";
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      field += char;
      state = "plain";
    }
  }

  if (state === "quoted") {
    return {
      ok: false,
      diagnostics: [quoteError(row, column, "the field has an unclosed quote.")],
    };
  }
  rows[row]!.push(field);
  // Trailing blank lines are an artefact of how text ends, not content.
  while (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "") rows.pop();
  return { ok: true, rows, delimiter, diagnostics: [] };
}

export function readDelimited(
  text: string,
  options: { delimiter?: Delimiter; allowRagged?: boolean } = {},
): DelimitedReadResult {
  if (text.length === 0) {
    return {
      ok: false,
      diagnostics: [errorDiagnostic("empty-input", "There is nothing to read.")],
    };
  }
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const parsed = parseRows(text, delimiter);
  if (!parsed.ok) return parsed;

  const rows = parsed.rows;
  if (rows.length === 0 || rows.every((row) => row.every((field) => field.trim() === ""))) {
    return {
      ok: false,
      diagnostics: [errorDiagnostic("no-content", "There are no filled cells to read.")],
    };
  }

  if (options.allowRagged) return { ok: true, rows, delimiter, diagnostics: [] };

  const normalised = normaliseRagged(rows);
  if (normalised.diagnostics.length > 0) return { ok: false, diagnostics: normalised.diagnostics };
  return { ok: true, rows: normalised.rows, delimiter, diagnostics: [] };
}
