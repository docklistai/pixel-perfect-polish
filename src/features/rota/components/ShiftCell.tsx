import * as React from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toneStyles } from "../data/mockData";
import type { Shift } from "../types";

export function ShiftCell({
  s,
  onOpen,
  ariaLabel,
}: {
  s: Shift;
  onOpen?: () => void;
  ariaLabel: string;
}) {
  if (s.flag === "off") {
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        <span aria-hidden>— Day off</span>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  if (s.flag === "open") {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className={`flex h-16 w-full flex-col justify-center rounded-[10px] border-2 px-2.5 text-xs transition hover:bg-warning-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles.open}`}
      >
        <div className="font-semibold text-warning-700">Open shift</div>
        <div className="flex items-center gap-1 text-[11px] text-warning-700/80">
          {s.role} <Plus className="h-3 w-3" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={`relative flex h-16 w-full flex-col justify-between rounded-[10px] border px-2.5 py-1.5 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles[s.tone]}`}
    >
      <div className="text-xs font-semibold tracking-tight">{s.time}</div>
      <div className="text-[11px] text-muted-foreground">{s.role}</div>
      {s.flag === "conflict" && (
        <AlertTriangle className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-warning" />
      )}
    </button>
  );
}
