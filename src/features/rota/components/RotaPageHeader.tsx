import * as React from "react";
import {
  Briefcase,
  ChevronDown,
  Copy,
  Eraser,
  Globe,
  Link2,
  List,
  Printer,
  Send,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";

type StatusTone = "success" | "warning";

const VIEW_MODES = ["Day", "Week", "Month"] as const;
const VIEW_BY_OPTIONS = [
  { label: "Employee", icon: Users },
  { label: "Role", icon: Briefcase },
  { label: "Location", icon: Globe },
] as const;

export function RotaPageHeader({
  weekLabel,
  locationName,
  staffCount,
  statusTone,
  statusLabel,
  canPublish,
  onTemplates,
  onPrintRota,
  onClearWeek,
  onCopyLastWeek,
  onGenerateRota,
  onOpenSupport,
  onPublish,
}: {
  weekLabel: string;
  locationName: string;
  staffCount: number;
  statusTone: StatusTone;
  statusLabel: string;
  canPublish: boolean;
  onTemplates: () => void;
  onPrintRota: () => void;
  onClearWeek: () => void;
  onCopyLastWeek: () => void;
  onGenerateRota: () => void;
  onOpenSupport: () => void;
  onPublish: () => void;
}) {
  const [viewMode, setViewMode] = React.useState<(typeof VIEW_MODES)[number]>("Week");
  const [viewBy, setViewBy] = React.useState<(typeof VIEW_BY_OPTIONS)[number]["label"]>("Employee");

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
        <div
          className="rota-view-modes inline-flex items-center gap-0.5 rounded-[9px] border border-border bg-muted/40 p-[3px]"
          role="group"
          aria-label="Rota view"
        >
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-[7px] px-3 py-1 text-xs font-semibold transition ${
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <RowActionMenu
          triggerLabel="Group rota by"
          trigger={
            <button type="button" className="rota-view-by btn secondary sm">
              View: {viewBy}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
          items={[
            { kind: "label", text: "View by" },
            ...VIEW_BY_OPTIONS.map((option) => ({
              label: option.label,
              icon: option.icon,
              onSelect: () => {
                setViewBy(option.label);
                toast.info("View changed", {
                  description: `Now grouping rota by ${option.label.toLowerCase()}`,
                });
              },
            })),
          ]}
        />
        <RowActionMenu
          triggerLabel="Rota tools"
          trigger={
            <button type="button" className="rota-tools btn outline-teal sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Tools
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
          items={[
            { kind: "label", text: "Rota tools" },
            { label: "Suggest open-shift fills", icon: Sparkles, onSelect: onGenerateRota },
            { label: "Manager support", icon: List, onSelect: onOpenSupport },
          ]}
        />
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
            { label: "Copy last week", icon: Copy, onSelect: onCopyLastWeek },
            { label: "Templates", icon: SlidersHorizontal, onSelect: onTemplates },
            { label: "Print rota", icon: Printer, onSelect: onPrintRota },
            {
              label: "Share draft link",
              icon: Link2,
              onSelect: () =>
                toast.info("Share link copied", {
                  description: "Read-only link copied to clipboard — not visible to staff.",
                }),
            },
            { kind: "separator" },
            { label: "Clear week", icon: Eraser, onSelect: onClearWeek, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
