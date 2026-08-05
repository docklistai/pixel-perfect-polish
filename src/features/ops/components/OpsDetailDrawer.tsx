import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { Check, ChevronDown, Copy, Pencil, Pin, Repeat, Archive } from "lucide-react";
import type { OpsEntry, OpsEntryDetail, OpsStaffOption, OpsStatus } from "../types";
import { PRIORITY_TONE, STATUS_LABEL } from "../lib/opsPresentation";
import { OpsDetailBody } from "./OpsDetailBody";

interface Props {
  entry: OpsEntry | null;
  detail: OpsEntryDetail | null;
  staff: OpsStaffOption[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onStatus: (id: string, status: OpsStatus) => Promise<boolean>;
  onAssign: (id: string, staffId: string | null) => Promise<boolean>;
  onPin: (entry: OpsEntry) => Promise<boolean>;
  onEdit: (entry: OpsEntry) => void;
  onDuplicate: (entry: OpsEntry) => void;
  onArchive: (entry: OpsEntry) => void;
  onAddNote: (id: string, note: string) => Promise<boolean>;
  onAddFollowUp: (entry: OpsEntry) => void;
  onOpenEntry: (id: string) => void;
}

export function OpsDetailDrawer(props: Props) {
  const entry = props.entry;
  if (!entry) return null;
  const statuses: OpsStatus[] = ["open", "in_progress", "resolved"];
  return (
    <DrawerShell
      open
      onOpenChange={props.onOpenChange}
      title={entry.title}
      description={`${entry.locationName}${entry.area ? ` · ${entry.area}` : ""}`}
      meta={
        <div className="flex items-center gap-2">
          <StatusBadge tone={PRIORITY_TONE[entry.priority]}>{entry.priority}</StatusBadge>
          <RowActionMenu
            triggerLabel="Entry actions"
            items={
              entry.status === "archived"
                ? []
                : [
                    ...(entry.status === "open" || entry.status === "in_progress"
                      ? [{ label: "Edit entry", icon: Pencil, onSelect: () => props.onEdit(entry) }]
                      : []),
                    {
                      label: "Duplicate as task",
                      icon: Copy,
                      onSelect: () => props.onDuplicate(entry),
                    },
                    ...(entry.status === "open" || entry.status === "in_progress"
                      ? [
                          {
                            label: entry.pinned ? "Unpin" : "Pin to today",
                            icon: Pin,
                            onSelect: () => void props.onPin(entry),
                          },
                        ]
                      : []),
                    { kind: "separator" },
                    {
                      label: "Archive entry",
                      icon: Archive,
                      danger: true,
                      onSelect: () => props.onArchive(entry),
                    },
                  ]
            }
          />
        </div>
      }
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => props.onOpenChange(false)}>
            Close
          </ActionButton>
          {entry.status !== "archived" && (
            <RowActionMenu
              triggerLabel="Change status"
              trigger={
                <button type="button" className="btn secondary sm">
                  <Repeat className="size-3" />
                  Status: {STATUS_LABEL[entry.status]}
                  <ChevronDown className="size-3" />
                </button>
              }
              items={statuses.map((status) => ({
                label: STATUS_LABEL[status],
                icon: entry.status === status ? Check : undefined,
                onSelect: () => void props.onStatus(entry.id, status),
              }))}
            />
          )}
          {entry.status !== "resolved" && entry.status !== "archived" && (
            <ActionButton size="sm" onClick={() => void props.onStatus(entry.id, "resolved")}>
              <Check className="mr-1.5 size-3" />
              Resolve
            </ActionButton>
          )}
        </>
      }
      width="lg"
    >
      <OpsDetailBody
        key={entry.id}
        entry={entry}
        detail={props.detail}
        staff={props.staff}
        pending={props.pending}
        onAddNote={(note) => props.onAddNote(entry.id, note)}
        onAssign={(staffId) => props.onAssign(entry.id, staffId)}
        onAddFollowUp={() => props.onAddFollowUp(entry)}
        onOpenFollowUp={props.onOpenEntry}
        onStatus={props.onStatus}
      />
    </DrawerShell>
  );
}
