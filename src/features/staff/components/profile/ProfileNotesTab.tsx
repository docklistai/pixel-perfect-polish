import * as React from "react";
import { Lock, Plus } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfileNote } from "../../types";

interface Props {
  notes: StaffProfileNote[];
  onSaveNote: (note: StaffProfileNote) => void;
}

const NOTE_TYPE_OPTIONS = [
  "General",
  "Scheduling",
  "Availability",
  "Coverage",
  "Feedback",
  "Admin",
];

export function ProfileNotesTab({ notes, onSaveNote }: Props) {
  const [noteType, setNoteType] = React.useState("General");
  const [noteText, setNoteText] = React.useState("");
  const [visibleToStaff, setVisibleToStaff] = React.useState(false);

  function handleSave() {
    if (!noteText.trim()) return;

    onSaveNote({
      date: "Just now",
      author: "You",
      type: noteType,
      text: noteText.trim(),
      visibleToStaff,
    });
    setNoteText("");
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <ProfileCard title="Notes">
          {notes.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No notes recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div
                  key={`${note.date}-${index}`}
                  className="rounded-xl border border-border/40 bg-card p-3 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{note.author}</span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {note.type}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{note.date}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{note.text}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden />
                    {note.visibleToStaff ? "Visible to staff" : "Manager note"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ProfileCard>
      </div>

      <div className="min-w-0">
        <ProfileCard title="Add note">
          <div className="space-y-3">
            <div>
              <label
                htmlFor="note-type"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Note type
              </label>
              <select
                id="note-type"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              >
                {NOTE_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="note-text"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Note
              </label>
              <textarea
                id="note-text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={5}
                placeholder="Add a manager note..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={visibleToStaff}
                onChange={(e) => setVisibleToStaff(e.target.checked)}
                className="mt-0.5"
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
