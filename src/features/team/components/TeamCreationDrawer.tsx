import * as React from "react";
import { Info, Calendar, GraduationCap } from "lucide-react";
import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import { audienceKey } from "../lib/teamPresentation";
import type { TeamAudience, TeamAudienceKind } from "../types";

export type TeamCreationKind = "training" | "event";

export interface TrainingReminderSubmission {
  kind: "training";
  title: string;
  dueAt: string;
  audienceKind: TeamAudienceKind;
  audienceDepartmentId: string | null;
  mandatory: boolean;
  note?: string;
}

export interface StaffEventSubmission {
  kind: "event";
  title: string;
  occursAt: string;
  note?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audiences: TeamAudience[];
  pending: boolean;
  initialKind?: TeamCreationKind;
  onCreateTraining: (submission: TrainingReminderSubmission) => Promise<boolean>;
  onCreateEvent: (submission: StaffEventSubmission) => Promise<boolean>;
}

function parseAudienceKey(
  key: string,
  audiences: TeamAudience[],
): { kind: TeamAudienceKind; departmentId: string | null } | null {
  const match = audiences.find((audience) => audienceKey(audience) === key);
  return match ? { kind: match.kind, departmentId: match.departmentId } : null;
}

export function TeamCreationDrawer({
  open,
  onOpenChange,
  audiences,
  pending,
  initialKind = "training",
  onCreateTraining,
  onCreateEvent,
}: Props) {
  const fieldId = React.useId();
  const [kind, setKind] = React.useState<TeamCreationKind>(initialKind);
  const [title, setTitle] = React.useState("");
  const [dateTime, setDateTime] = React.useState("");
  const [selectedAudienceKey, setSelectedAudienceKey] = React.useState("");
  const [mandatory, setMandatory] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setTitle("");
    // Default to tomorrow 09:00 local time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDateTime(localIso);
    setSelectedAudienceKey(audiences[0] ? audienceKey(audiences[0]) : "");
    setMandatory(false);
    setNote("");
    setTouched(false);
  }, [open, initialKind, audiences]);

  const selectedAudience = audiences.find(
    (audience) => audienceKey(audience) === selectedAudienceKey,
  );

  const titleError = title.trim().length === 0 ? "A title is required." : null;
  const dateTimeError = dateTime.trim().length === 0 ? "A date and time are required." : null;
  const audienceError =
    kind === "training" && !selectedAudience ? "Choose who this reminder goes to." : null;

  const invalid = Boolean(titleError || dateTimeError || audienceError);
  const showError = (message: string | null) => (touched && message ? message : null);

  const handleSubmit = async () => {
    setTouched(true);
    if (invalid) return;

    const isoDate = new Date(dateTime).toISOString();

    if (kind === "training") {
      const audience = parseAudienceKey(selectedAudienceKey, audiences);
      if (!audience) return;
      const ok = await onCreateTraining({
        kind: "training",
        title: title.trim(),
        dueAt: isoDate,
        audienceKind: audience.kind,
        audienceDepartmentId: audience.departmentId,
        mandatory,
        note: note.trim() || undefined,
      });
      if (ok) onOpenChange(false);
    } else {
      const ok = await onCreateEvent({
        kind: "event",
        title: title.trim(),
        occursAt: isoDate,
        note: note.trim() || undefined,
      });
      if (ok) onOpenChange(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "training" ? "Add training reminder" : "Add staff event"}
      description={
        kind === "training"
          ? "Set a compliance or training deadline for staff"
          : "Add an upcoming event for your workspace"
      }
      width="md"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSubmit} disabled={pending || (touched && invalid)}>
            {pending ? "Saving…" : kind === "training" ? "Create reminder" : "Create event"}
          </ActionButton>
        </>
      }
    >
      <div className="flex gap-2 p-1 bg-muted/40 rounded-lg mb-4">
        <button
          type="button"
          onClick={() => setKind("training")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
            kind === "training"
              ? "bg-background shadow-xs text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="size-3.5" aria-hidden />
          Training reminder
        </button>
        <button
          type="button"
          onClick={() => setKind("event")}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
            kind === "event"
              ? "bg-background shadow-xs text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="size-3.5" aria-hidden />
          Staff event
        </button>
      </div>

      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        {kind === "training"
          ? "Training reminders surface on manager dashboards and team views. They do not alter shift schedules."
          : "Staff events appear on the Team calendar view for your workspace."}
      </div>

      <FormSection title={kind === "training" ? "Reminder details" : "Event details"}>
        <FormRow label="Title" required htmlFor={`${fieldId}-title`}>
          <input
            id={`${fieldId}-title`}
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(showError(titleError))}
            placeholder={
              kind === "training" ? "e.g. Food Hygiene Level 2 renewal" : "e.g. Summer Staff Social"
            }
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {showError(titleError) && (
            <p className="mt-1 text-xs text-danger">{showError(titleError)}</p>
          )}
        </FormRow>

        <FormRow
          label={kind === "training" ? "Due date & time" : "Date & time"}
          required
          htmlFor={`${fieldId}-datetime`}
        >
          <input
            id={`${fieldId}-datetime`}
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(showError(dateTimeError))}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {showError(dateTimeError) && (
            <p className="mt-1 text-xs text-danger">{showError(dateTimeError)}</p>
          )}
        </FormRow>

        {kind === "training" && (
          <FormRow label="Audience" required htmlFor={`${fieldId}-audience`}>
            <select
              id={`${fieldId}-audience`}
              value={selectedAudienceKey}
              onChange={(e) => setSelectedAudienceKey(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {audiences.map((audience) => (
                <option key={audienceKey(audience)} value={audienceKey(audience)}>
                  {audience.label} ({audience.memberCount})
                </option>
              ))}
            </select>
            {showError(audienceError) && (
              <p className="mt-1 text-xs text-danger">{showError(audienceError)}</p>
            )}
          </FormRow>
        )}

        <FormRow label="Short note (optional)" htmlFor={`${fieldId}-note`}>
          <textarea
            id={`${fieldId}-note`}
            rows={3}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any instructions, links, or context for managers…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </FormRow>
      </FormSection>

      {kind === "training" && (
        <FormSection title="Compliance">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={mandatory}
              onChange={(e) => setMandatory(e.target.checked)}
            />
            <div>
              <div className="text-sm font-medium">Mandatory training</div>
              <div className="text-xs text-muted-foreground">
                Flags overdue completions as non-compliant in team reports.
              </div>
            </div>
          </label>
        </FormSection>
      )}
    </DrawerShell>
  );
}
