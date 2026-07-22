import * as React from "react";
import { inlineEditorAccessibleName } from "./rotaGridAccessibility";
import { buildInlineCellPreview } from "./inlineCellPreview";
import type { InlineCellParseOptions } from "./inlineCellParsing";

export interface InlineCellEditorProps {
  initial: string;
  /** Staff member and day context, e.g. "Sophie Carter, Mon 15". */
  contextLabel: string;
  /** Roles and default used to interpret typed input, matching the commit path. */
  parseOptions?: InlineCellParseOptions;
  onCommit: (val: string) => void | Promise<void>;
  onCancel: () => void;
}

export function InlineCellEditor({
  initial,
  contextLabel,
  parseOptions,
  onCommit,
  onCancel,
}: InlineCellEditorProps) {
  const [val, setVal] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const instructionsId = React.useId();
  const previewId = React.useId();

  const preview = React.useMemo(
    () => buildInlineCellPreview(val, parseOptions),
    [val, parseOptions],
  );
  // Neither tone writes anything, but only "error" is the manager's mistake:
  // "blocked" means the command was understood and this pilot does not record it.
  const invalid = preview.tone === "error";
  const unsupported = preview.tone === "blocked";
  const blocked = invalid || unsupported;

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const commit = () => {
    const trimmed = (val || "").trim();
    void onCommit(trimmed);
  };

  return (
    <div className="rounded-lg border-2 border-brand bg-card p-1.5 shadow-md">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        // Invalid input is never written on blur — the editor closes without
        // saving, and the preview below has already said why.
        onBlur={() => (blocked ? onCancel() : commit())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            // Stay open on invalid input so the manager can correct it.
            if (!blocked) commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        aria-label={inlineEditorAccessibleName(contextLabel)}
        aria-describedby={`${instructionsId} ${previewId}`}
        aria-invalid={invalid || undefined}
        placeholder="9-5, open 6-11 bar, clear, or 9-12 / 17-22"
        className="w-full bg-transparent border-0 outline-none p-0.5 font-mono text-xs font-semibold text-foreground focus:ring-0"
      />

      <div
        id={previewId}
        role="status"
        aria-live="polite"
        className={`mt-1 px-0.5 text-[9px] leading-snug ${
          invalid ? "text-danger" : unsupported ? "text-muted-foreground" : "text-brand"
        }`}
      >
        {preview.tone === "idle" ? "" : preview.summary}
      </div>

      <div
        id={instructionsId}
        className="text-[9px] text-muted-foreground mt-1 px-0.5 flex justify-between"
      >
        <span>{invalid ? "fix to save" : unsupported ? "not saved" : "↵ save"}</span>
        <span>esc cancel</span>
      </div>
    </div>
  );
}
