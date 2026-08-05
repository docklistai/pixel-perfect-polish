import * as React from "react";
import { Plus } from "lucide-react";
import { ActionButton, DialogShell, FormRow, StatusBadge } from "@/components/dl";
import type { OpsBriefing, OpsLinkableEntry, OpsLocation, OpsManagerOption } from "../types";
import { OpsBriefingViewer } from "./OpsBriefingViewer";
import { OpsEntryPicker, OpsManagerRecipientPicker } from "./OpsCollaborationPickers";
import { localDateInTimezone } from "../lib/opsDates";
import { recipientForActor } from "../lib/opsRecipients";

interface Props {
  open: boolean;
  selected: OpsBriefing | null;
  actorMembershipId: string;
  onClose: () => void;
  locations: OpsLocation[];
  managers: OpsManagerOption[];
  entries: OpsLinkableEntry[];
  pending: boolean;
  onCreate: (value: {
    locationId: string;
    briefingDate: string;
    title: string;
    summary: string;
    recipientMembershipIds: string[];
    entryIds: string[];
  }) => Promise<boolean>;
  onRead: (id: string) => Promise<boolean>;
  onAcknowledge: (id: string) => Promise<boolean>;
  onOpenEntry: (id: string) => void;
}

export function OpsBriefingDialog(props: Props) {
  const { open, selected, onRead } = props;
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [locationId, setLocationId] = React.useState(props.locations[0]?.id ?? "");
  const [recipientIds, setRecipientIds] = React.useState<string[]>([]);
  const [entryIds, setEntryIds] = React.useState<string[]>([]);
  const markedReadId = React.useRef<string | null>(null);
  const recipients = React.useMemo(
    () => props.managers.filter((manager) => !manager.isSelf),
    [props.managers],
  );
  const eligibleEntries = props.entries.filter(
    (entry) => entry.locationId === locationId && entry.status !== "archived",
  );
  React.useEffect(() => {
    if (open && !selected) {
      setRecipientIds(recipients.map((manager) => manager.id));
      setEntryIds([]);
      setTitle("");
      setSummary("");
    }
  }, [open, selected, recipients]);
  React.useEffect(() => {
    if (!open) markedReadId.current = null;
    const mine = selected ? recipientForActor(selected.recipients, props.actorMembershipId) : null;
    if (open && selected && mine && !mine.readAt && markedReadId.current !== selected.id) {
      markedReadId.current = selected.id;
      void onRead(selected.id);
    }
  }, [open, selected, onRead, props.actorMembershipId]);
  if (!props.open) return null;
  if (props.selected) {
    return (
      <OpsBriefingViewer
        briefing={props.selected}
        actorMembershipId={props.actorMembershipId}
        entries={props.entries}
        pending={props.pending}
        onClose={props.onClose}
        onAcknowledge={props.onAcknowledge}
        onOpenEntry={props.onOpenEntry}
      />
    );
  }
  const location = props.locations.find((item) => item.id === locationId);
  const submit = async () => {
    if (!location || !title.trim() || !summary.trim() || recipientIds.length === 0) return;
    if (
      await props.onCreate({
        locationId,
        briefingDate: localDateInTimezone(location.timezone),
        title,
        summary,
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
      title="New operational briefing"
      description="Authored manager-to-manager summary, distinct from Team announcements"
      icon={Plus}
      iconTone="purple"
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            onClick={submit}
            disabled={
              props.pending || !title.trim() || !summary.trim() || recipientIds.length === 0
            }
          >
            Create briefing
          </ActionButton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow label="Location" htmlFor="ops-briefing-location">
          <select
            id="ops-briefing-location"
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
        />
        <div className="sm:col-span-2">
          <FormRow label="Title" htmlFor="ops-briefing-title">
            <input
              id="ops-briefing-title"
              className="input w-full"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </FormRow>
        </div>
        <div className="sm:col-span-2">
          <FormRow label="Operational summary" htmlFor="ops-briefing-summary">
            <textarea
              id="ops-briefing-summary"
              className="textarea w-full"
              rows={7}
              maxLength={6000}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </FormRow>
        </div>
      </div>
      <OpsEntryPicker
        entries={eligibleEntries}
        selectedIds={entryIds}
        onChange={setEntryIds}
        label="Relevant Ops items"
      />
    </DialogShell>
  );
}
