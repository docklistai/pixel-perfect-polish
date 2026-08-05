import * as React from "react";
import { FilePlus2, FileText, Send } from "lucide-react";
import { ActionButton, DialogShell, FormRow } from "@/components/dl";
import type {
  OpsHandover,
  OpsLinkableEntry,
  OpsLocation,
  OpsManagerOption,
  OpsRisk,
} from "../types";
import { OpsHandoverHistory } from "./OpsHandoverHistory";
import { OpsEntryPicker, OpsManagerRecipientPicker } from "./OpsCollaborationPickers";
import { localDateInTimezone } from "../lib/opsDates";

interface Props {
  open: boolean;
  onClose: () => void;
  locations: OpsLocation[];
  managers: OpsManagerOption[];
  entries: OpsLinkableEntry[];
  risks: OpsRisk[];
  pending: boolean;
  handovers: OpsHandover[];
  actorMembershipId: string;
  selectedHandoverId?: string | null;
  onAcknowledge: (id: string) => Promise<boolean>;
  onSave: (value: {
    locationId: string;
    handoverDate: string;
    rotaWeekId: string | null;
    notes: string;
    recipientMembershipIds: string[];
    entryIds: string[];
  }) => Promise<boolean>;
}

export function OpsHandoverModal(props: Props) {
  const recipients = React.useMemo(
    () => props.managers.filter((manager) => !manager.isSelf),
    [props.managers],
  );
  const [locationId, setLocationId] = React.useState(props.locations[0]?.id ?? "");
  const [recipientIds, setRecipientIds] = React.useState<string[]>([]);
  const [entryIds, setEntryIds] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const location = props.locations.find((item) => item.id === locationId);
  const entries = React.useMemo(
    () =>
      props.entries.filter(
        (entry) =>
          entry.locationId === locationId && ["open", "in_progress"].includes(entry.status),
      ),
    [locationId, props.entries],
  );
  React.useEffect(() => {
    if (props.open) {
      setRecipientIds(recipients.map((manager) => manager.id));
      setEntryIds(entries.map((entry) => entry.id));
    }
  }, [props.open, recipients, entries]);
  const draft = () => {
    const selected = entries.filter((entry) => entryIds.includes(entry.id));
    const lines = selected.map(
      (entry) => `• ${entry.title} — ${entry.status.replace("_", " ")}, ${entry.priority} priority`,
    );
    const riskCount = props.risks.filter(
      (risk) => risk.entryId && entryIds.includes(risk.entryId),
    ).length;
    setNotes(
      [
        `${selected.length} unresolved operational item${selected.length === 1 ? "" : "s"} attached.`,
        riskCount
          ? `${riskCount} deterministic risk${riskCount === 1 ? "" : "s"} require attention.`
          : "No attached items currently trigger an Ops risk rule.",
        ...lines,
      ].join("\n"),
    );
  };
  const submit = async () => {
    if (!location || !notes.trim() || recipientIds.length === 0) return;
    if (
      await props.onSave({
        locationId,
        handoverDate: localDateInTimezone(location.timezone),
        rotaWeekId: entries.find((entry) => entry.rotaWeekId)?.rotaWeekId ?? null,
        notes,
        recipientMembershipIds: recipientIds,
        entryIds,
      })
    )
      props.onClose();
  };
  return (
    <DialogShell
      open={props.open}
      onOpenChange={(open) => !open && props.onClose()}
      title="Write handover note"
      description="Retained manager-to-manager operational handover"
      icon={FileText}
      iconTone="purple"
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton variant="outline" onClick={draft}>
            <FilePlus2 className="mr-1.5 size-3" />
            Draft from live Ops
          </ActionButton>
          <ActionButton
            onClick={submit}
            disabled={props.pending || !notes.trim() || recipientIds.length === 0}
          >
            <Send className="mr-1.5 size-3" />
            Issue handover
          </ActionButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow label="Location" htmlFor="ops-handover-location">
          <select
            id="ops-handover-location"
            className="select w-full"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {props.locations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </FormRow>
        <OpsManagerRecipientPicker
          managers={recipients}
          selectedIds={recipientIds}
          onChange={setRecipientIds}
          label="Recipients"
        />
      </div>
      <OpsEntryPicker
        entries={entries}
        selectedIds={entryIds}
        onChange={setEntryIds}
        label="Unresolved items"
        emptyText="No unresolved items at this location."
        showPriority
      />
      <div className="mt-3">
        <FormRow label="Notes" htmlFor="ops-handover-notes">
          <textarea
            id="ops-handover-notes"
            className="textarea w-full"
            rows={8}
            maxLength={4000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormRow>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        The draft uses only the selected unresolved items and deterministic risk rules. Review it
        before issuing.
      </p>
      <OpsHandoverHistory
        handovers={props.handovers}
        actorMembershipId={props.actorMembershipId}
        selectedHandoverId={props.selectedHandoverId}
        onAcknowledge={props.onAcknowledge}
      />
    </DialogShell>
  );
}
