import * as React from "react";
import { CopyPlus, Eraser, FileUp, LayoutTemplate, Printer, Send } from "lucide-react";
import { ActionButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";

type StatusTone = "success" | "warning";
type RotaLocationOption = { id: string; name: string };

export function RotaPageHeader({
  weekLabel,
  locationName,
  locations = [],
  locationId = null,
  onLocationChange,
  locationChangeDisabled = false,
  staffCount,
  statusTone,
  statusLabel,
  canPublish,
  onPrintRota,
  onClearWeek,
  onOpenTemplates,
  onCopyDay,
  onImportSchedule,
  onPublish,
}: {
  weekLabel: string;
  locationName: string;
  /** Active rota locations; the selector renders only when more than one exists. */
  locations?: RotaLocationOption[];
  locationId?: string | null;
  onLocationChange?: (locationId: string) => void;
  locationChangeDisabled?: boolean;
  staffCount: number;
  statusTone: StatusTone;
  statusLabel: string;
  canPublish: boolean;
  onPrintRota: () => void;
  onClearWeek: () => void;
  onOpenTemplates: () => void;
  onCopyDay: () => void;
  onImportSchedule: () => void;
  onPublish: () => void;
}) {
  const showLocationSelector = locations.length > 1 && Boolean(onLocationChange);
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
        {showLocationSelector ? (
          <p className="rota-page-subtitle flex flex-wrap items-center gap-1.5">
            <span>Week of {weekLabel} ·</span>
            <select
              className="select h-7 w-auto max-w-[220px] px-2 py-0 text-xs"
              aria-label="Rota location"
              disabled={locationChangeDisabled}
              value={locationId ?? ""}
              onChange={(event) => onLocationChange?.(event.target.value)}
            >
              {locations.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <span>· {staffCount} staff</span>
          </p>
        ) : (
          <p className="rota-page-subtitle">
            Week of {weekLabel} · {locationName} · {staffCount} staff
          </p>
        )}
      </div>
      <div className="rota-page-actions flex flex-wrap items-center gap-2 lg:justify-end">
        {/* Discoverable during a guided session; the overflow menu keeps them too. */}
        <ActionButton
          variant="secondary"
          size="sm"
          icon={LayoutTemplate}
          onClick={onOpenTemplates}
          title="Save this week's shape, or stamp a saved one onto this week"
        >
          Templates
        </ActionButton>
        <ActionButton variant="secondary" size="sm" icon={CopyPlus} onClick={onCopyDay}>
          Copy day
        </ActionButton>
        <ActionButton variant="ghost" size="sm" icon={Printer} onClick={onPrintRota}>
          Print
        </ActionButton>
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
            { label: "Import a schedule", icon: FileUp, onSelect: onImportSchedule },
            { label: "Print rota", icon: Printer, onSelect: onPrintRota },

            { kind: "separator" },
            { label: "Clear week", icon: Eraser, onSelect: onClearWeek, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
