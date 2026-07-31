import { errorDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";

/**
 * The two shape decisions a delimited paste needs, kept apart from the quote
 * state machine that decodes it.
 *
 * Both are places where guessing would be destructive rather than merely wrong,
 * which is why each is a deliberate rule with its reasoning attached.
 */

export type Delimiter = "\t" | ",";

const QUOTE = '"';

/**
 * Picks the delimiter by counting candidates outside quoted fields across the
 * whole text. Tabs win ties because a spreadsheet paste is tab-separated and a
 * comma inside a name is far more common than a tab inside one.
 *
 * The choice is made for the **whole document**, never per line. Choosing it
 * line by line is how a single stray tab could make one row split differently
 * from its neighbours.
 */
export function detectDelimiter(text: string): Delimiter {
  let tabs = 0;
  let commas = 0;
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === QUOTE) {
      if (inQuotes && text[i + 1] === QUOTE) i += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (char === "\t") tabs += 1;
    else if (char === ",") commas += 1;
  }
  return tabs >= commas && tabs > 0 ? "\t" : commas > 0 ? "," : "\t";
}

/**
 * Pads short rows to the widest row, but only where doing so cannot invent a
 * destructive instruction.
 *
 * A missing field reads as "this cell was empty", and an empty field clears its
 * target. That is safe when no other row carries content in the missing columns —
 * the usual case of a spreadsheet trimming trailing blanks. If another row does
 * have content there, the short row is genuinely ambiguous: it could mean "leave
 * alone" or "clear", so it is refused rather than guessed.
 */
export function normaliseRagged(rows: string[][]): {
  rows: string[][];
  diagnostics: ParseDiagnostic[];
} {
  const width = Math.max(...rows.map((row) => row.length));
  if (rows.every((row) => row.length === width)) return { rows, diagnostics: [] };

  for (const [index, row] of rows.entries()) {
    for (let column = row.length; column < width; column += 1) {
      const contested = rows.some((other) => (other[column] ?? "").trim().length > 0);
      if (contested) {
        return {
          rows,
          diagnostics: [
            errorDiagnostic(
              "ragged-row",
              `The pasted rows are not the same width, and column ${column + 1} has content in ` +
                "some rows but is missing from others. Copy a complete rectangle and paste again.",
              { row: index + 1, column: column + 1 },
            ),
          ],
        };
      }
    }
  }
  return {
    rows: rows.map((row) => [...row, ...Array(width - row.length).fill("")]),
    diagnostics: [],
  };
}
