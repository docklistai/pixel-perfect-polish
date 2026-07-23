/**
 * Clipboard TSV reader for Excel, Google Sheets and hand-written tab text.
 *
 * Spreadsheets quote any field containing a tab, newline or quote and double the
 * inner quotes. This repo never emits such a field, but a manager pasting from a
 * real spreadsheet can, so quoting is honoured rather than ignored — and
 * malformed quoting is refused outright instead of being guessed at.
 */

export type RotaTsvParseResult = { ok: true; rows: string[][] } | { ok: false; message: string };

const TAB = "\t";
const QUOTE = '"';

type FieldState = "start" | "plain" | "quoted" | "closed";

function quoteError(row: number, column: number, detail: string): RotaTsvParseResult {
  return {
    ok: false,
    message: `Malformed quoted field at row ${row + 1}, column ${column + 1}: ${detail}`,
  };
}

/** Strict TSV state machine: quotes only delimit a whole field. */
function parseRows(text: string): RotaTsvParseResult {
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
      if (char !== QUOTE) {
        field += char;
      } else if (text[i + 1] === QUOTE) {
        field += QUOTE;
        i += 1;
      } else {
        state = "closed";
      }
      continue;
    }
    if (state === "closed") {
      if (char === TAB) pushField();
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        pushRow();
      } else {
        return quoteError(row, column, "characters appear after a closed quoted field.");
      }
      continue;
    }
    if (char === QUOTE) {
      if (state !== "start") {
        return quoteError(row, column, "a quote appears inside an unquoted field.");
      }
      state = "quoted";
    } else if (char === TAB) {
      pushField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      field += char;
      state = "plain";
    }
  }
  if (state === "quoted") return quoteError(row, column, "the field has an unclosed quote.");
  rows[row]!.push(field);
  while (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "") rows.pop();
  return { ok: true, rows };
}

/**
 * Pads short rows to the widest row, but only where doing so cannot invent a
 * destructive instruction.
 *
 * A missing field is read as "this cell was empty", and an empty field clears
 * its target. That reading is safe when no other row carries content in the
 * missing columns — the usual case of a spreadsheet trimming trailing blanks. If
 * another row does have content there, the short row is genuinely ambiguous: it
 * could mean "leave alone" or "clear", so it is refused.
 */
function normaliseRagged(rows: string[][]): RotaTsvParseResult {
  const width = Math.max(...rows.map((row) => row.length));
  if (rows.every((row) => row.length === width)) return { ok: true, rows };

  for (const row of rows) {
    for (let column = row.length; column < width; column += 1) {
      const contested = rows.some((other) => (other[column] ?? "").trim().length > 0);
      if (contested) {
        return {
          ok: false,
          message:
            `The pasted rows are not the same width, and column ${column + 1} has content in ` +
            "some rows but is missing from others. Copy a complete rectangle and paste again.",
        };
      }
    }
  }
  return { ok: true, rows: rows.map((row) => [...row, ...Array(width - row.length).fill("")]) };
}

export function parseRotaTsvClipboard(text: string): RotaTsvParseResult {
  if (text.length === 0) {
    return { ok: false, message: "The clipboard is empty." };
  }
  const parsed = parseRows(text);
  if (!parsed.ok) return parsed;
  const rows = parsed.rows;
  if (rows.length === 0 || rows.every((row) => row.every((field) => field.trim() === ""))) {
    return { ok: false, message: "The clipboard has no rota cells in it." };
  }
  return normaliseRagged(rows);
}
