import * as React from "react";
import { MessageSquare, Tag, Download } from "lucide-react";

interface StaffBulkBarProps {
  count: number;
  onMessage: () => void;
  onTag: () => void;
  onExport: () => void;
  onClear: () => void;
}

const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-card/80 px-2.5 py-1 text-xs font-medium text-brand hover:bg-card transition-colors";

export function StaffBulkBar({ count, onMessage, onTag, onExport, onClear }: StaffBulkBarProps) {
  return (
    <div
      className="mx-4 mb-3 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-sm"
      style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
    >
      <span className="text-xs font-semibold" style={{ color: "var(--st-teal-ink)" }}>
        {count} selected
      </span>
      <div className="flex-1" />
      <button type="button" onClick={onMessage} className={ghostBtn}>
        <MessageSquare className="h-3.5 w-3.5" aria-hidden /> Message
      </button>
      <button type="button" onClick={onTag} className={ghostBtn}>
        <Tag className="h-3.5 w-3.5" aria-hidden /> Tag
      </button>
      <button type="button" onClick={onExport} className={ghostBtn}>
        <Download className="h-3.5 w-3.5" aria-hidden /> Export
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium transition-colors"
        style={{ color: "var(--st-teal-ink)" }}
      >
        Clear
      </button>
    </div>
  );
}
