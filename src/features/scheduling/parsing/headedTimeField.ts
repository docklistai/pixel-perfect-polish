import { errorDiagnostic, warningDiagnostic, type ParseDiagnostic } from "./parseDiagnostics";
import {
  describeResolvedTimes,
  parseTimePart,
  resolveTimePair,
  SUPPORTED_TIME_FORMATS,
} from "@/features/rota/lib/scheduling/shiftTimeVocabulary";
import {
  getShiftDurationMinutes,
  MAX_SHIFT_DURATION_MINUTES,
} from "@/features/rota/lib/rotaTimeUtils";

/**
 * The start and end of one imported row.
 *
 * Two rules meet here, and they are deliberately separate. What the written
 * times MEAN comes from the shared scheduling vocabulary, so a row reads exactly
 * as the same text typed into a rota cell. What is a usable SHIFT comes from the
 * rota's own duration rule, so an import cannot create a shift the grid would
 * have refused — both surfaces write the same records, and a limit only one of
 * them applied was a limit the other could be used to get around.
 *
 * Every refusal quotes the times as resolved, never a replacement, so a manager
 * reading "09:00–02:00 is 17 hours" can see what the importer actually made of
 * what they wrote.
 */

export const TIME_FORMAT_HELP = `Use a time like ${SUPPORTED_TIME_FORMATS.slice(0, 5).join(", ")}.`;

const MAX_SHIFT_HOURS = MAX_SHIFT_DURATION_MINUTES / 60;

export type TimesRead =
  | { ok: true; start: string; end: string; diagnostics: ParseDiagnostic[] }
  | { ok: false; diagnostics: ParseDiagnostic[] };

/** "17 hours", "16 hours 1 minute" — the length in the manager's own units. */
function describeDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = `${hours} hour${hours === 1 ? "" : "s"}`;
  if (rest === 0) return hourText;
  return `${hourText} ${rest} minute${rest === 1 ? "" : "s"}`;
}

/**
 * Start and end together, through the same vocabulary the inline editor uses.
 *
 * They are resolved as a pair rather than one at a time because that is what
 * makes "9"–"5" a nine-to-five: the end is read in the light of the start. An
 * imported row never has a preceding segment, so no afternoon context is
 * carried into it.
 */
export function readTimes(startCell: string, endCell: string, row: number): TimesRead {
  const startText = startCell.trim();
  const endText = endCell.trim();
  const diagnostics: ParseDiagnostic[] = [];

  if (parseTimePart(startText) === null) {
    diagnostics.push(
      errorDiagnostic("invalid-value", `"${startText}" is not a time. ${TIME_FORMAT_HELP}`, {
        row,
        field: "start",
      }),
    );
  }
  if (parseTimePart(endText) === null) {
    diagnostics.push(
      errorDiagnostic("invalid-value", `"${endText}" is not a time. ${TIME_FORMAT_HELP}`, {
        row,
        field: "end",
      }),
    );
  }
  if (diagnostics.length > 0) return { ok: false, diagnostics };

  const resolved = resolveTimePair(startText, endText);
  if (!resolved) {
    return {
      ok: false,
      diagnostics: [
        errorDiagnostic("invalid-value", `"${startText}"–"${endText}" is not a shift.`, {
          row,
          field: "start",
        }),
      ],
    };
  }

  // A shift that starts and ends at the same time is not a short shift, it is a
  // 24-hour one: the signature reads it as overnight and the apply reconstructs
  // the end on the following day. The inline editor has always refused this;
  // widening the accepted spellings made it easier to write by accident here.
  const duration = getShiftDurationMinutes(resolved.start, resolved.end);
  if (duration === null) {
    return {
      ok: false,
      diagnostics: [
        errorDiagnostic(
          "invalid-value",
          `This row starts and ends at ${resolved.start}, so it has no length.`,
          { row, field: "end" },
        ),
      ],
    };
  }

  // The rota grid's ceiling, applied to the same records the grid creates. An
  // overnight shift is measured across midnight, so "17:00"–"04:00" is eleven
  // hours and passes, while "09:00"–"02:00" is seventeen and does not.
  if (duration > MAX_SHIFT_DURATION_MINUTES) {
    return {
      ok: false,
      diagnostics: [
        errorDiagnostic(
          "invalid-value",
          `${resolved.start}–${resolved.end} is ${describeDuration(duration)} long, and a shift cannot be longer than ${MAX_SHIFT_HOURS} hours.`,
          { row, field: "end" },
        ),
      ],
    };
  }

  return {
    ok: true,
    start: resolved.start,
    end: resolved.end,
    // The same read-back the inline editor shows, for the same reason: hours
    // written bare have two readings and the chosen one must be visible.
    diagnostics: resolved.ambiguousBareHours
      ? [
          warningDiagnostic("ambiguous-time", describeResolvedTimes(resolved.start, resolved.end), {
            row,
            field: "start",
          }),
        ]
      : [],
  };
}
