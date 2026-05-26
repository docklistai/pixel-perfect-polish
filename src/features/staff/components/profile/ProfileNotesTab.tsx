import * as React from "react";
import { Pin, Plus } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { ProfileNoteCard } from "./ProfileNoteCard";
import type { StaffProfileNote } from "../../types";

interface Props {
  notes: StaffProfileNote[];
  onSaveNote: (note: StaffProfileNote) => void;
}

const NOTE_TYPES = ["General", "Scheduling", "Availability", "Coverage", "Documents", "Handover"];
const NOTE_FILTERS = [
  { id: "all", label: "All" },
  { id: "internal", label: "Managers" },
  { id: "shared", label: "Shared" },
  { id: "availability", label: "Availability" },
  { id: "coverage", label: "Coverage" },
  { id: "documents", label: "Documents" },
] as const;

type NoteFilter = (typeof NOTE_FILTERS)[number]["id"];

function matchesFilter(note: StaffProfileNote, filter: NoteFilter) {
  const type = note.type.toLowerCase();
  if (filter === "all") return true;
  if (filter === "internal") return !note.visibleToStaff;
  if (filter === "shared") return note.visibleToStaff;
  if (filter === "documents") return type.includes("document");
  return type.includes(filter);
}

export function ProfileNotesTab({ notes, onSaveNote }: Props) {
  const [filter, setFilter] = React.useState<NoteFilter>("all");
  const [noteType, setNoteType] = React.useState("Scheduling");
  const [noteText, setNoteText] = React.useState("");
  const [visibleToStaff, setVisibleToStaff] = React.useState(false);

  const filtered = React.useMemo(
    () => notes.filter((note) => matchesFilter(note, filter)),
    [filter, notes],
  );
  const featured = filtered.filter((note) => !note.visibleToStaff).slice(0, 2);
  const remaining = filtered.filter((note) => !featured.includes(note));

  function handleSave() {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    onSaveNote({
      date: "Just now",
      author: "You",
      type: noteType,
      text: trimmed,
      visibleToStaff,
    });
    setNoteText("");
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card p-2">
          {NOTE_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === option.id
                  ? "bg-[var(--bg-raised)] text-foreground shadow-[var(--shadow-1)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} notes</div>
        </div>

        {featured.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Priority notes
            </div>
            {featured.map((note, index) => (
              <ProfileNoteCard
                key={`${note.date}-${note.author}-${index}`}
                note={note}
                featured
                onReply={() => undefined}
                onPin={() => undefined}
              />
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {featured.length > 0 ? "Other notes" : "Notes"}
          </div>
          {filtered.length === 0 ? (
            <ProfileCard title="Notes">
              <div className="rounded-2xl border border-dashed border-border/50 bg-[var(--bg-raised)] px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Pin className="h-4 w-4" aria-hidden />
                </div>
                <div className="text-sm font-semibold">No notes yet</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add an operational note about rota, availability, coverage, or document follow-up.
                </p>
              </div>
            </ProfileCard>
          ) : (
            remaining.map((note, index) => (
              <ProfileNoteCard
                key={`${note.date}-${note.author}-${index}`}
                note={note}
                onReply={() => undefined}
                onPin={() => undefined}
              />
            ))
          )}
        </div>
      </div>

      <div className="min-w-0">
        <ProfileCard
          title="Add note"
          action={
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
              Manager use
            </span>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {NOTE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNoteType(type)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      noteType === type
                        ? "border-transparent bg-brand text-white"
                        : "border-border/40 bg-[var(--bg-raised)] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this to rota context, handover notes, availability, or document follow-up.
              </p>
            </div>

            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={6}
              placeholder="Add a manager note..."
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand"
            />

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={visibleToStaff}
                onChange={(event) => setVisibleToStaff(event.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              Visible to staff member
            </label>

            <button
              type="button"
              onClick={handleSave}
              disabled={!noteText.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Save note
            </button>
          </div>
        </ProfileCard>
      </div>
    </div>
  );
}
