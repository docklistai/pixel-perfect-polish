import * as React from "react";
import { Eraser, Printer, Send } from "lucide-react";
import { ActionButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";

type StatusTone = "success" | "warning";

export function RotaPageHeader({
  weekLabel,
  locationName,
  staffCount,
  statusTone,
  statusLabel,
  canPublish,
  onPrintRota,
  onClearWeek,
  onPublish,
}: {
  weekLabel: string;
  locationName: string;
  staffCount: number;
  statusTone: StatusTone;
  statusLabel: string;
  canPublish: boolean;
  onPrintRota: () => void;
  onClearWeek: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="rota-page-header mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="rota-page-title">Rota</h1>
          <span className={`rota-status ${statusTone === "success" ? "green" : "amber"}`}>
            <span className={`dot ${statusTone === "warning" ? "pulse" : ""}`} aria-hidden />
            {statusLabel}
          </span>
        </div>
        <p className="rota-page-subtitle">
          Week of {weekLabel} · {locationName} · {staffCount} staff
        </p>
      </div>
      <div className="rota-page-actions flex flex-wrap items-center gap-2 lg:justify-end">
        <div className="rota-view-modes inline-flex items-center gap-0.5 rounded-[9px] border border-border bg-muted/40 p-[3px]">
          <span className="rounded-[7px] bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
            Week view
          </span>
        </div>

        {canPublish && (
          <ActionButton className="rota-publish" size="sm" icon={Send} onClick={onPublish}>
            Publish
          </ActionButton>
        )}
        <RowActionMenu
          triggerLabel="More rota actions"
          className="rota-more"
          items={[
            { kind: "label", text: "Planning" },
            { label: "Print rota", icon: Printer, onSelect: onPrintRota },

            { kind: "separator" },
            { label: "Clear week", icon: Eraser, onSelect: onClearWeek, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
