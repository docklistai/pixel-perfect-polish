import { MAX_IMPORT_TEXT_LENGTH } from "../../api/importScheduleProposal";

/**
 * Reading a schedule file the manager picked, into the text the importer
 * already understands.
 *
 * This exists so that choosing a file and pasting its contents are the *same*
 * import. Nothing is uploaded, nothing is stored, and no parsing happens here:
 * the file is decoded to text in the browser and handed to the identical
 * preview call a paste makes. A second ingest path would be a second set of
 * rules to keep in step with the parser.
 *
 * Every refusal is a refusal to *read*, never to interpret — an unsupported
 * extension, an unreadable file, an empty one, or one larger than a single
 * import can carry. What the text then means is the parser's business.
 */

/** Extensions the importer can decode as text. No spreadsheet formats. */
export const ACCEPTED_IMPORT_FILE_EXTENSIONS = [".csv", ".tsv", ".txt"] as const;

/** The `accept` attribute for the file input, from the same list. */
export const ACCEPTED_IMPORT_FILE_ACCEPT = ACCEPTED_IMPORT_FILE_EXTENSIONS.join(",");

/** Human list for help copy — "CSV, TSV or TXT". */
export const ACCEPTED_IMPORT_FILE_LABEL = "CSV, TSV or TXT";

/** The shape this needs from a browser `File`, so it is testable without one. */
export type ImportFileLike = { name: string; text: () => Promise<string> };

export type ImportFileRead =
  | { ok: true; text: string; name: string }
  | { ok: false; message: string };

export function hasSupportedImportExtension(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return ACCEPTED_IMPORT_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * Decodes one picked file, or says why it cannot be used.
 *
 * The extension is checked before the read rather than after: a manager who
 * picked their `.xlsx` should be told that Docklist needs a saved-as-CSV
 * export, not shown whatever binary noise decoding it produced.
 */
export async function readImportFile(file: ImportFileLike): Promise<ImportFileRead> {
  const name = file.name.trim();
  if (!hasSupportedImportExtension(name)) {
    return {
      ok: false,
      message: `Docklist can read ${ACCEPTED_IMPORT_FILE_LABEL} files, and "${name}" is not one. In your spreadsheet choose File → Save as (or Export) and pick CSV, then import that.`,
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return {
      ok: false,
      message: `"${name}" could not be read. Check the file opens on this device, then choose it again.`,
    };
  }

  if (text.trim().length === 0) {
    return { ok: false, message: `"${name}" is empty, so there is nothing to import.` };
  }

  // Checked here so an oversized file is refused while the manager is still
  // looking at the picker, rather than by the server after a round trip.
  if (text.length > MAX_IMPORT_TEXT_LENGTH) {
    return {
      ok: false,
      message: `"${name}" is too large for one import. Split it into smaller files — one week at a time — and import them one after another.`,
    };
  }

  return { ok: true, text, name };
}
