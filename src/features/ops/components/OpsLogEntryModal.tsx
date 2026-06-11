import * as React from "react";
import { Check, Info, Plus } from "lucide-react";
import { DialogShell, ActionButton, FormRow } from "@/components/dl";
import {
  logEntryTypes,
  logEntrySeverities,
  logEntryLocations,
  logEntryStaff,
} from "../data/opsOverlayData";

interface OpsLogEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entry: { title: string; type: string; severity: string }) => void;
}

/** "Log a new entry" modal — prototype parity. Saving adds the entry to the timeline. */
export function OpsLogEntryModal({ open, onClose, onSave }: OpsLogEntryModalProps) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState(logEntryTypes[0]);
  const [severity, setSeverity] = React.useState(logEntrySeverities[0]);

  const handleSave = () => {
    onSave({ title: title.trim() || "New ops entry", type, severity });
    setTitle("");
    onClose();
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Log a new entry"
      description="Incident, maintenance ticket, or general note"
      icon={Plus}
      iconTone="brand"
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSave}>
            <Check className="mr-1.5 h-3.5 w-3.5" /> Save entry
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FormRow label="Title" htmlFor="ops-log-title">
            <input
              id="ops-log-title"
              className="input w-full"
              placeholder="Short description — e.g. AC not cooling, Room 412"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormRow>
        </div>
        <FormRow label="Type" htmlFor="ops-log-type">
          <select
            id="ops-log-type"
            className="select w-full"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {logEntryTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Severity" htmlFor="ops-log-severity">
          <select
            id="ops-log-severity"
            className="select w-full"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            {logEntrySeverities.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Location" htmlFor="ops-log-location">
          <select id="ops-log-location" className="select w-full">
            {logEntryLocations.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Logged by" htmlFor="ops-log-by">
          <select id="ops-log-by" className="select w-full" defaultValue={logEntryStaff[0]}>
            {logEntryStaff.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormRow>
        <div className="col-span-2">
          <FormRow label="Description" htmlFor="ops-log-description">
            <textarea
              id="ops-log-description"
              className="textarea w-full"
              rows={3}
              placeholder="What happened, when, and any immediate action taken…"
            />
          </FormRow>
        </div>
      </div>

      <div
        className="card mt-3 rounded-xl border p-0"
        style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
      >
        <div className="flex gap-2 p-3.5">
          <Info
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--st-teal-ink)" }}
            aria-hidden
          />
          <p className="text-[13px] leading-normal" style={{ color: "var(--ink-800)" }}>
            The incident is the <strong>record</strong>. If follow-up action is needed, add a
            follow-up task from the incident detail after saving.
          </p>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px]">
        <input type="checkbox" defaultChecked className="rounded" />
        Add a follow-up task after saving
      </label>
    </DialogShell>
  );
}
