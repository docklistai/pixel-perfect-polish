import {
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { ActionButton, IconButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";

export function OpsPageHeaderActions(props: {
  filtersOpen: boolean;
  hasFilters: boolean;
  onToggleFilters: () => void;
  onManagerSupport: () => void;
  onHandover: () => void;
  onLogEntry: () => void;
  onExport: () => void;
  onPrintBriefing: () => void;
  onSettings: () => void;
}) {
  return (
    <>
      <ActionButton
        variant="outline"
        icon={SlidersHorizontal}
        onClick={props.onToggleFilters}
        aria-expanded={props.filtersOpen}
      >
        Filters{props.hasFilters ? " · active" : ""}
      </ActionButton>
      <ActionButton variant="outline" icon={Sparkles} onClick={props.onManagerSupport}>
        Manager support
      </ActionButton>
      <ActionButton variant="secondary" icon={FileText} onClick={props.onHandover}>
        Handover note
      </ActionButton>
      <ActionButton icon={Plus} onClick={props.onLogEntry}>
        Log entry
      </ActionButton>
      <RowActionMenu
        triggerLabel="More actions"
        trigger={<IconButton icon={MoreHorizontal} label="More actions" />}
        items={[
          { label: "Export today's log", icon: Download, onSelect: props.onExport },
          { label: "Print briefing", icon: Printer, onSelect: props.onPrintBriefing },
          { kind: "separator" },
          { label: "Settings", icon: Settings, onSelect: props.onSettings },
        ]}
      />
    </>
  );
}
