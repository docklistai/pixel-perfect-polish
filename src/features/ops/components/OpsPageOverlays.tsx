import type * as React from "react";
import type { useOpsChecklistCommands } from "../hooks/useOpsChecklistCommands";
import type { useOpsCollaborationCommands } from "../hooks/useOpsCollaborationCommands";
import type { useOpsEntryCommands } from "../hooks/useOpsEntryCommands";
import type { useOpsPage } from "../hooks/useOpsPage";
import type { OpsEntry, OpsPageData } from "../types";
import { OpsArchiveDialog } from "./OpsArchiveDialog";
import { OpsBriefingDialog } from "./OpsBriefingDialog";
import { OpsChecklistDialog } from "./OpsChecklistDialog";
import { OpsDetailDrawer } from "./OpsDetailDrawer";
import { OpsHandoverModal } from "./OpsHandoverModal";
import { OpsLogEntryModal } from "./OpsLogEntryModal";

interface Props {
  page: ReturnType<typeof useOpsPage>;
  data: OpsPageData;
  entries: ReturnType<typeof useOpsEntryCommands>;
  collaboration: ReturnType<typeof useOpsCollaborationCommands>;
  checklists: ReturnType<typeof useOpsChecklistCommands>;
  editEntry: OpsEntry | null;
  seedEntry: OpsEntry | null;
  archiveEntry: OpsEntry | null;
  briefingId: string | null;
  checklistRunId: string | null;
  openNew: (seed?: OpsEntry | null, edit?: OpsEntry | null) => void;
  setArchiveEntry: React.Dispatch<React.SetStateAction<OpsEntry | null>>;
}

export function OpsPageOverlays(props: Props) {
  const { page, data, entries, collaboration, checklists } = props;
  const selectedBriefing = data.briefings.find((item) => item.id === props.briefingId) ?? null;
  return (
    <>
      <OpsLogEntryModal
        open={page.logEntryOpen}
        onClose={() => page.setLogEntryOpen(false)}
        locations={data.locations}
        departments={data.departments}
        staff={data.staff}
        prefill={page.prefill}
        editEntry={props.editEntry}
        seedEntry={props.seedEntry}
        pending={page.actions.pending}
        onSave={(draft, followUp) => entries.save(draft, followUp, props.editEntry)}
      />
      <OpsHandoverModal
        open={page.handoverOpen}
        onClose={() => page.setHandoverOpen(false)}
        locations={data.locations}
        managers={data.managers}
        entries={data.linkableEntries.filter((entry) =>
          ["open", "in_progress"].includes(entry.status),
        )}
        risks={data.risks}
        pending={page.actions.pending}
        onSave={collaboration.handover}
        handovers={data.handovers}
        actorMembershipId={data.actorMembershipId}
        selectedHandoverId={page.selectedHandoverId}
        onAcknowledge={collaboration.acknowledgeHandover}
      />
      <OpsBriefingDialog
        open={page.briefingOpen}
        selected={selectedBriefing}
        actorMembershipId={data.actorMembershipId}
        onClose={() => page.setBriefingOpen(false)}
        locations={data.locations}
        managers={data.managers}
        entries={data.linkableEntries}
        pending={page.actions.pending}
        onCreate={collaboration.briefing}
        onRead={collaboration.readBriefing}
        onAcknowledge={collaboration.acknowledgeBriefing}
        onOpenEntry={(id) => {
          page.setBriefingOpen(false);
          page.setSelectedId(id);
        }}
      />
      <OpsChecklistDialog
        open={page.checklistOpen}
        onClose={() => page.setChecklistOpen(false)}
        selectedRunId={props.checklistRunId}
        templates={data.checklistTemplates}
        runs={data.checklistRuns}
        locations={data.locations}
        departments={data.departments}
        staff={data.staff}
        pending={page.actions.pending}
        onCreateTemplate={checklists.createTemplate}
        onSetTemplateActive={checklists.setTemplateActive}
        onStartRun={checklists.startRun}
        onSetItem={checklists.setItem}
        onReview={checklists.review}
        onOpenEntry={(id) => {
          page.setChecklistOpen(false);
          page.setSelectedId(id);
        }}
      />
      <OpsDetailDrawer
        entry={page.selectedEntry}
        detail={data.detail}
        staff={data.staff}
        pending={page.actions.pending}
        onOpenChange={(open) => !open && page.setSelectedId(null)}
        onStatus={entries.status}
        onAssign={entries.assign}
        onPin={entries.pin}
        onEdit={(entry) => props.openNew(null, entry)}
        onDuplicate={(entry) =>
          props.openNew({
            ...entry,
            id: crypto.randomUUID(),
            entryType: "task",
            title: `Copy of ${entry.title}`,
            parentEntryId: null,
          })
        }
        onArchive={props.setArchiveEntry}
        onAddNote={entries.note}
        onAddFollowUp={(entry) =>
          props.openNew({
            ...entry,
            id: crypto.randomUUID(),
            entryType: "task",
            title: `Follow up: ${entry.title}`,
            parentEntryId: entry.id,
            severity: null,
            occurredAt: null,
            immediateAction: null,
          })
        }
        onOpenEntry={page.setSelectedId}
      />
      <OpsArchiveDialog
        entry={props.archiveEntry}
        pending={page.actions.pending}
        onClose={() => props.setArchiveEntry(null)}
        onArchive={(reason) => entries.archive(props.archiveEntry!.id, reason)}
      />
    </>
  );
}
