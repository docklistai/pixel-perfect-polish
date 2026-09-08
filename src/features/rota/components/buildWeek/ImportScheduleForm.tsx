import type { ChangeEvent, Dispatch } from "react";
import { FileUp } from "lucide-react";
import { FormSection } from "@/components/dl";
import { SUPPORTED_TIME_FORMATS } from "@/features/rota/lib/scheduling/shiftTimeVocabulary";
import {
  DATE_ORDERS,
  type ImportDrawerEvent,
  type ImportDrawerState,
} from "./importScheduleDrawerState";
import {
  ACCEPTED_IMPORT_FILE_ACCEPT,
  ACCEPTED_IMPORT_FILE_LABEL,
  readImportFile,
} from "./importSourceFile";

/**
 * What to import, and how to read its dates.
 *
 * The two questions a manager answers before anything is sent anywhere. They sit
 * together because the second one changes the meaning of the first: the same
 * file is a different week depending on the declared date order.
 *
 * A schedule arrives either way — chosen as a file or pasted — and both land in
 * the same `text`, so there is exactly one thing to preview and one thing to
 * apply. The file never leaves the browser.
 *
 * Every event goes straight to the drawer's reducer, so this file holds no state
 * of its own and cannot disagree with what will be previewed.
 */
export function ImportScheduleForm({
  state,
  dispatch,
}: {
  state: ImportDrawerState;
  dispatch: Dispatch<ImportDrawerEvent>;
}) {
  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared so picking the same file twice still fires a change event — a
    // manager who fixed their spreadsheet and re-chose it expects a re-read.
    event.target.value = "";
    if (!file) return;
    const read = await readImportFile(file);
    if (!read.ok) {
      dispatch({ type: "source-failed", message: read.message });
      return;
    }
    dispatch({ type: "source-selected", text: read.text, sourceName: read.name });
  };

  return (
    <>
      <FormSection
        title="1. Choose a file, or paste the schedule"
        description="Docklist reads a long list of shifts, or a grid with staff down the side and days across the top. The file stays on this device."
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-brand hover:bg-brand-soft/20">
            <FileUp className="h-3.5 w-3.5 text-brand" aria-hidden />
            Choose a file
            <input
              type="file"
              accept={ACCEPTED_IMPORT_FILE_ACCEPT}
              className="sr-only"
              onChange={(event) => void handleFile(event)}
            />
          </label>
          <span className="text-xs text-muted-foreground">
            {state.sourceName ? (
              <>
                Reading <strong className="font-semibold">{state.sourceName}</strong> — edit below
                to change it.
              </>
            ) : (
              `${ACCEPTED_IMPORT_FILE_LABEL} — or paste straight from a spreadsheet.`
            )}
          </span>
        </div>
        <textarea
          value={state.text}
          onChange={(event) => dispatch({ type: "text-changed", text: event.target.value })}
          rows={7}
          spellCheck={false}
          aria-label="Schedule to import"
          placeholder={"Date,Staff,Role,Start,End\n2026-08-03,Ana Chef,Chef,09:00,17:00"}
          className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Times can be written{" "}
          {SUPPORTED_TIME_FORMATS.map((format) => (
            <code key={format} className="mx-0.5 rounded bg-muted/50 px-1 font-mono">
              {format}
            </code>
          ))}{" "}
          — the same as typing into a rota cell. A shift that ends before it starts, such as{" "}
          <code className="rounded bg-muted/50 px-1 font-mono">9pm</code> to{" "}
          <code className="rounded bg-muted/50 px-1 font-mono">2am</code>, is read as overnight.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Rows that cannot be read are listed and left out. Everything else is still imported.
        </p>
      </FormSection>

      <FormSection
        title="2. Say how dates are written"
        description="03/08/2026 means different days in different places, so this is never guessed."
      >
        <div className="flex flex-wrap gap-2">
          {DATE_ORDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => dispatch({ type: "date-order-changed", dateOrder: option.value })}
              aria-pressed={state.dateOrder === option.value}
              className={`rounded-xl border px-3 py-2 text-xs transition ${
                state.dateOrder === option.value
                  ? "border-brand bg-brand-soft/25 font-semibold"
                  : "border-border hover:border-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </FormSection>
    </>
  );
}
