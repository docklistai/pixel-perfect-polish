import * as React from "react";
import { Check, Info, Plus } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
import type { OpsEntryDraft } from "../api/opsEntryMutations";
import type { OpsDepartment, OpsEntry, OpsLocation, OpsPrefill, OpsStaffOption } from "../types";
import { initialOpsEntryDraft } from "../lib/opsEntryDraft";
import { OpsLogEntryFields } from "./OpsLogEntryFields";

type Draft = OpsEntryDraft;
interface Props {
  open: boolean;
  onClose: () => void;
  locations: OpsLocation[];
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
  prefill: OpsPrefill;
  editEntry?: OpsEntry | null;
  seedEntry?: OpsEntry | null;
  pending: boolean;
  onSave: (draft: Draft, addFollowUp: boolean) => Promise<boolean>;
}

export function OpsLogEntryModal(props: Props) {
  const sourceEntry = props.editEntry ?? props.seedEntry;
  const [draft, setDraft] = React.useState<Draft>(() =>
    initialOpsEntryDraft(props.locations, props.prefill, sourceEntry),
  );
  const [addFollowUp, setAddFollowUp] = React.useState(false);
  React.useEffect(() => {
    if (props.open) setDraft(initialOpsEntryDraft(props.locations, props.prefill, sourceEntry));
  }, [props.open, props.locations, props.prefill, sourceEntry]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    if (!draft.title.trim() || !draft.locationId) return;
    if (await props.onSave(draft, addFollowUp)) {
      setAddFollowUp(false);
      props.onClose();
    }
  };
  return (
    <DialogShell
      open={props.open}
      onOpenChange={(open) => !open && props.onClose()}
      title={props.editEntry ? "Edit operational entry" : "Log a new entry"}
      description="Task, incident, maintenance, service request, or manager note"
      icon={Plus}
      iconTone="brand"
      size="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={props.onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            onClick={submit}
            disabled={props.pending || !draft.title.trim() || !draft.locationId}
          >
            <Check className="mr-1.5 size-3.5" />
            Save entry
          </ActionButton>
        </>
      }
    >
      <OpsLogEntryFields
        draft={draft}
        set={set}
        locations={props.locations}
        departments={props.departments}
        staff={props.staff}
        editing={Boolean(props.editEntry)}
      />
      {(draft.rotaWeekId || draft.shiftId || draft.leaveRequestId) && (
        <div className="guidance-note mt-3">
          <Info className="size-3.5" aria-hidden />
          Scheduling context is attached and will remain read-only from Ops.
        </div>
      )}
      {!props.editEntry && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={addFollowUp}
            onChange={(e) => setAddFollowUp(e.target.checked)}
          />
          Add a follow-up task after saving
        </label>
      )}
    </DialogShell>
  );
}
