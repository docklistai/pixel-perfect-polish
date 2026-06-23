import * as React from "react";
import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { Check, ChevronDown, Copy, Pencil, Pin, Repeat, Trash2 } from "lucide-react";
import { resolveOpsDetails } from "../data/opsDetails";
import { OpsDetailBody } from "./OpsDetailBody";
import { notifyOpsPreview } from "../lib/opsPreview";
import type { OpsEntry } from "../types";

export const OPS_STATUSES = ["Open", "In progress", "Done", "Closed"] as const;

interface OpsDetailDrawerProps {
  entry: OpsEntry | null;
  onOpenChange: (open: boolean) => void;
  onChangeStatus: (id: string, status: string, options?: { close?: boolean }) => void;
  onDelete: (id: string) => void;
}

export function OpsDetailDrawer({
  entry,
  onOpenChange,
  onChangeStatus,
  onDelete,
}: OpsDetailDrawerProps) {
  const entryDetails = React.useMemo(() => {
    if (!entry) return null;
    return resolveOpsDetails(entry.title, entry.area.split("·")[0]?.trim() || "Main building");
  }, [entry]);

  if (!entry || !entryDetails) return null;

  const priorityTone = entry.prioTone === "danger" ? "danger" : "warning";

  return (
    <DrawerShell
      open={entry !== null}
      onOpenChange={onOpenChange}
      title={entry.title}
      description={`${entry.t} · ${entry.area}`}
      meta={
        <div className="flex items-center gap-2">
          {entry.prio && <StatusBadge tone={priorityTone}>{entry.prio}</StatusBadge>}
          <RowActionMenu
            triggerLabel="Entry actions"
            items={[
              {
                label: "Edit entry",
                icon: Pencil,
                onSelect: () => notifyOpsPreview("Editing entries"),
              },
              {
                label: "Duplicate as task",
                icon: Copy,
                onSelect: () => notifyOpsPreview("Duplicating as a task"),
              },
              {
                label: "Pin to today",
                icon: Pin,
                onSelect: () => notifyOpsPreview("Pinning entries"),
              },
              { kind: "separator" },
              {
                label: "Delete entry",
                icon: Trash2,
                danger: true,
                onSelect: () => {
                  onOpenChange(false);
                  onDelete(entry.id);
                },
              },
            ]}
          />
        </div>
      }
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <RowActionMenu
            triggerLabel="Change status"
            trigger={
              <button type="button" className="btn secondary sm">
                <Repeat className="h-3 w-3" aria-hidden /> Status: {entry.st}
                <ChevronDown className="h-3 w-3" aria-hidden />
              </button>
            }
            items={[
              { kind: "label", text: "Change status" },
              ...OPS_STATUSES.map((s) => ({
                label: s,
                icon: entry.st === s ? Check : undefined,
                onSelect: () => onChangeStatus(entry.id, s),
              })),
            ]}
          />
          <ActionButton
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onChangeStatus(entry.id, "Done", { close: true });
            }}
          >
            <Check className="mr-1.5 h-3 w-3" /> Mark done
          </ActionButton>
        </>
      }
      width="lg"
    >
      <OpsDetailBody key={entry.id} entry={entry} details={entryDetails} />
    </DrawerShell>
  );
}
