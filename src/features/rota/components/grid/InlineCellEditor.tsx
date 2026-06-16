import * as React from "react";

export interface InlineCellEditorProps {
  initial: string;
  onCommit: (val: string) => void | Promise<void>;
  onCancel: () => void;
}

export function InlineCellEditor({ initial, onCommit, onCancel }: InlineCellEditorProps) {
  const [val, setVal] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const commit = () => {
    const trimmed = (val || "").trim();
    if (!trimmed) void onCommit("off");
    else if (/^off$/i.test(trimmed) || /^day off$/i.test(trimmed)) void onCommit("off");
    else if (/^open/i.test(trimmed) || /^unassigned/i.test(trimmed)) void onCommit("open");
    else void onCommit(trimmed);
  };

  return (
    <div className="rounded-lg border-2 border-brand bg-card p-1.5 shadow-md">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="09:00 - 17:00 or OFF / Open"
        className="w-full bg-transparent border-0 outline-none p-0.5 font-mono text-xs font-semibold text-foreground focus:ring-0"
      />
      <div className="text-[9px] text-muted-foreground mt-1 px-0.5 flex justify-between">
        <span>↵ save</span>
        <span>esc cancel</span>
      </div>
    </div>
  );
}
