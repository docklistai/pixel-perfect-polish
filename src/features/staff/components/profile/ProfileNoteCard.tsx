import * as React from "react";
import { Lock, MoreHorizontal, Pin, Reply } from "lucide-react";
import type { StaffProfileNote } from "../../types";

export function ProfileNoteCard({
  note,
  onReply,
  onPin,
  featured = false,
}: {
  note: StaffProfileNote;
  onReply: () => void;
  onPin: () => void;
  featured?: boolean;
}) {
  const initials = note.author
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        featured
          ? "border-[var(--st-amber-line)] bg-[var(--st-amber-bg)]"
          : "border-border/40 bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{note.author}</span>
            <span className="text-xs text-muted-foreground">{note.date}</span>
            <span className="rounded-full border border-border/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {note.type}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              {note.visibleToStaff ? "Shared" : "Managers only"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">{note.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={onReply}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <Reply className="h-3.5 w-3.5" aria-hidden />
              Reply
            </button>
            <button
              type="button"
              onClick={onPin}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <Pin className="h-3.5 w-3.5" aria-hidden />
              Pin
            </button>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
            >
              More
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
