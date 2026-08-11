import * as React from "react";
import { MessageSquare, Send } from "lucide-react";
import { formatDateTime } from "../lib/teamFormatting";
import type { TeamAnnouncementComment } from "../types";

interface Props {
  comments: TeamAnnouncementComment[];
  pending: boolean;
  onAdd: (body: string) => Promise<boolean>;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Manager notes attached to ONE announcement. The comments are passed in from
 * the selected announcement, so there is no local list to bleed across records
 * — the previous drawer kept them in component state that never reset.
 */
export function TeamAnnouncementComments({ comments, pending, onAdd }: Props) {
  const [draft, setDraft] = React.useState("");

  const submit = async () => {
    const body = draft.trim();
    if (!body || pending) return;
    const ok = await onAdd(body);
    if (ok) setDraft("");
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Manager notes ({comments.length})
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No notes yet. Notes are visible to managers only.
        </p>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-3 bg-muted/25 border border-border/60 rounded-xl items-start"
            >
              <div className="av sm av-c2" aria-hidden>
                {initials(comment.authorName ?? "Manager")}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {comment.authorName ?? "Manager"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    · {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground/90 break-words">{comment.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center bg-card border border-input rounded-xl p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
        <MessageSquare className="h-4 w-4 text-muted-foreground/60 shrink-0 ml-2" aria-hidden />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note for other managers…"
          maxLength={2000}
          aria-label="Add a manager note"
          className="flex-1 bg-transparent border-0 outline-none text-xs px-2 placeholder:text-muted-foreground/60"
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        <button
          type="button"
          aria-label="Add manager note"
          onClick={() => void submit()}
          disabled={!draft.trim() || pending}
          className="p-1.5 rounded-lg text-brand hover:bg-brand-soft/20 disabled:opacity-40 transition-all shrink-0"
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
