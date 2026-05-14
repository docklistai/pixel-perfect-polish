import * as React from "react";
import { Lock } from "lucide-react";
import { AlertCard } from "@/components/dl";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const NOTE_TYPE_OPTIONS = [
  "General",
  "Scheduling",
  "Absence",
  "Training",
  "Positive feedback",
  "Concern",
];

export function ProfileNotesTab({ profile }: Props) {
  const [noteType, setNoteType] = React.useState("General");
  const [noteText, setNoteText] = React.useState("");
  const [visibleToStaff, setVisibleToStaff] = React.useState(false);

  return (
    <div className="space-y-4">
      <AlertCard
        tone="info"
        icon={Lock}
        title="Manager-only notes"
        description="These notes are private by default and will not be visible to the staff member unless explicitly marked otherwise."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Notes timeline */}
        <div className="xl:col-span-2">
          <ProfileCard title="Notes">
            {profile.notes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No notes recorded yet.</p>
            ) : (
              <ul className="space-y-4">
                {profile.notes.map((note, i) => (
                  <li
                    key={i}
                    className="relative pl-5 pb-4 border-b border-border/40 last:border-0 last:pb-0"
                  >
                    <span
                      className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-brand"
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold">{note.author}</span>
                      <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {note.type}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{note.date}</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed">{note.text}</p>
                    {!note.visibleToStaff && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" aria-hidden />
                        Manager only
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ProfileCard>
        </div>

        {/* Add note */}
        <div>
          <ProfileCard title="Add note">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
                  Note type
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {NOTE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">
                  Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  placeholder="Add a manager note..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToStaff}
                  onChange={(e) => setVisibleToStaff(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground">Visible to staff member</span>
              </label>
              <button
                type="button"
                className="w-full rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-95"
              >
                Save note
              </button>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );
}
