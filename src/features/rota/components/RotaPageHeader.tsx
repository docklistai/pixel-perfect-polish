import * as React from "react";
import { CopyPlus, Eraser, LayoutTemplate, Printer, Send } from "lucide-react";
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
  onOpenTemplates,
  onCopyDay,
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
  onOpenTemplates: () => void;
  onCopyDay: () => void;
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
            { label: "Copy or clear a day", icon: CopyPlus, onSelect: onCopyDay },
            { label: "Rota templates", icon: LayoutTemplate, onSelect: onOpenTemplates },
            { label: "Print rota", icon: Printer, onSelect: onPrintRota },

            { kind: "separator" },
            { label: "Clear week", icon: Eraser, onSelect: onClearWeek, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
