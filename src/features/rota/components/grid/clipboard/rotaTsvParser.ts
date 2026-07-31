import { readDelimited } from "@/features/scheduling/parsing/delimitedReader";

/**
 * Clipboard TSV reader for Excel, Google Sheets and hand-written tab text.
 *
 * The decoding itself now lives in the shared `delimitedReader`, which this
 * module's state machine became — same quoting rules, same refusal of malformed
 * quoting, same rule for padding short rows only when it cannot invent a
 * destructive instruction. Clipboard paste pins the delimiter to tab because that
 * is what a spreadsheet copy produces; a comma in a role name is then just a
 * character, not a column break.
 */

export type RotaTsvParseResult = { ok: true; rows: string[][] } | { ok: false; message: string };

export function parseRotaTsvClipboard(text: string): RotaTsvParseResult {
  if (text.length === 0) return { ok: false, message: "The clipboard is empty." };

  const result = readDelimited(text, { delimiter: "\t" });
  if (!result.ok) {
    const first = result.diagnostics[0];
    if (first?.code === "no-content") {
      return { ok: false, message: "The clipboard has no rota cells in it." };
    }
    if (first?.code === "malformed-quote" && first.row !== undefined) {
      return {
        ok: false,
        message: `Malformed quoted field at row ${first.row}, column ${first.column}: ${first.message.replace(/^Malformed quoted field: /, "")}`,
      };
    }
    return { ok: false, message: first?.message ?? "The clipboard could not be read." };
  }
  return { ok: true, rows: result.rows };
}
