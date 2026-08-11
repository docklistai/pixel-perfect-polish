import * as React from "react";
import { Info } from "lucide-react";
import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import { audienceKey } from "../lib/teamPresentation";
import type { TeamAudience, TeamAudienceKind } from "../types";

export interface ComposeSubmission {
  title: string;
  body: string;
  audienceKind: TeamAudienceKind;
  audienceDepartmentId: string | null;
  pinned: boolean;
  requiresAcknowledgement: boolean;
  highlightInUpdates: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audiences: TeamAudience[];
  pending: boolean;
  presetAudienceKey?: string | null;
  onSubmit: (submission: ComposeSubmission) => Promise<boolean>;
}

function parseAudienceKey(
  key: string,
  audiences: TeamAudience[],
): { kind: TeamAudienceKind; departmentId: string | null } | null {
  const match = audiences.find((audience) => audienceKey(audience) === key);
  return match ? { kind: match.kind, departmentId: match.departmentId } : null;
}

const EMPTY = {
  title: "",
  body: "",
  pinned: false,
  requiresAcknowledgement: true,
  highlightInUpdates: true,
};

export function TeamComposeDrawer({
  open,
  onOpenChange,
  audiences,
  pending,
  presetAudienceKey,
  onSubmit,
}: Props) {
  const fieldId = React.useId();
  const [form, setForm] = React.useState(EMPTY);
  const [selectedKey, setSelectedKey] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  // Reset on each open so a previous draft never leaks into a new announcement,
  // and honour a preset audience when the manager arrived from a quick group.
  React.useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setTouched(false);
    setSelectedKey(presetAudienceKey ?? (audiences[0] ? audienceKey(audiences[0]) : ""));
  }, [open, presetAudienceKey, audiences]);

  const selectedAudience = audiences.find((audience) => audienceKey(audience) === selectedKey);
  const titleError = form.title.trim().length === 0 ? "A subject is required." : null;
  const bodyError = form.body.trim().length === 0 ? "A message body is required." : null;
  const audienceError = !selectedAudience
    ? "Choose who this goes to."
    : selectedAudience.memberCount === 0
      ? "This audience has no people in it yet."
      : null;
  const invalid = Boolean(titleError || bodyError || audienceError);

  const handleSubmit = async () => {
    setTouched(true);
    const audience = parseAudienceKey(selectedKey, audiences);
    if (invalid || !audience) return;
    const ok = await onSubmit({
      title: form.title.trim(),
      body: form.body.trim(),
      audienceKind: audience.kind,
      audienceDepartmentId: audience.departmentId,
      pinned: form.pinned,
      requiresAcknowledgement: form.requiresAcknowledgement,
      highlightInUpdates: form.highlightInUpdates,
    });
    if (ok) onOpenChange(false);
  };

  const showError = (message: string | null) => (touched && message ? message : null);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Compose announcement"
      description="Send an update to your team"
      width="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSubmit} disabled={pending || (touched && invalid)}>
            {pending ? "Publishing…" : "Publish"}
          </ActionButton>
        </>
      }
    >
      <div className="guidance-note mb-4">
        <Info className="h-3 w-3 shrink-0" aria-hidden />
        {selectedAudience
          ? `This will reach ${selectedAudience.memberCount} ${
              selectedAudience.memberCount === 1 ? "person" : "people"
            } in ${selectedAudience.label}.`
          : "Choose an audience to see how many people this reaches."}
      </div>

      <FormSection title="Message">
        <FormRow label="Subject" required htmlFor={`${fieldId}-subject`}>
          <input
            id={`${fieldId}-subject`}
            value={form.title}
            maxLength={200}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(showError(titleError))}
            placeholder="Short, clear subject line…"
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {showError(titleError) && (
            <p className="mt-1 text-xs text-danger">{showError(titleError)}</p>
          )}
        </FormRow>
        <FormRow label="Body" required htmlFor={`${fieldId}-body`}>
          <textarea
            id={`${fieldId}-body`}
            rows={8}
            value={form.body}
            maxLength={4000}
            onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(showError(bodyError))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Write your announcement here. Keep it short and direct — staff read these on their phones."
          />
          {showError(bodyError) && (
            <p className="mt-1 text-xs text-danger">{showError(bodyError)}</p>
          )}
        </FormRow>
      </FormSection>

      <FormSection title="Audience">
        <FormRow label="Send to" htmlFor={`${fieldId}-audience`}>
          <select
            id={`${fieldId}-audience`}
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {audiences.length === 0 && <option value="">No audiences available</option>}
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
      </FormSection>

      <FormSection title="Options">
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={form.pinned}
              onChange={(event) => setForm((prev) => ({ ...prev, pinned: event.target.checked }))}
            />
            <div>
              <div className="text-sm font-semibold">Pin to top</div>
              <div className="text-xs text-muted-foreground">Keeps it at the top of the list</div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={form.requiresAcknowledgement}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requiresAcknowledgement: event.target.checked }))
              }
            />
            <div>
              <div className="text-sm font-semibold">Require acknowledgement</div>
              <div className="text-xs text-muted-foreground">
                Each person confirms they have read it
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 rounded"
              checked={form.highlightInUpdates}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, highlightInUpdates: event.target.checked }))
              }
            />
            <div>
              <div className="text-sm font-semibold">Highlight in staff updates</div>
              <div className="text-xs text-muted-foreground">
                Saved with the announcement and used when staff see their updates
              </div>
            </div>
          </label>
        </div>
      </FormSection>
    </DrawerShell>
  );
}
