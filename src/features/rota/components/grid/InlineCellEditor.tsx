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
    void onCommit(trimmed);
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
        placeholder="9-5, open 6-11 bar, clear, or 9-12 / 17-22"
        className="w-full bg-transparent border-0 outline-none p-0.5 font-mono text-xs font-semibold text-foreground focus:ring-0"
      />
      <div className="text-[9px] text-muted-foreground mt-1 px-0.5 flex justify-between">
        <span>↵ save</span>
        <span>esc cancel</span>
      </div>
    </div>
  );
}
