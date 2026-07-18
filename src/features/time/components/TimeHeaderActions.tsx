import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Calendar,
  Plus,
  Users,
  Sparkles,
} from "lucide-react";
import { ActionButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import {
  currentWeekPeriod,
  shiftPeriod,
  weekPeriodOf,
  type ReviewPeriod,
} from "../lib/reviewPeriod";

export const TEAM_OPTIONS = [
  "All teams",
  "Front of House",
  "Kitchen",
  "Bar",
  "Housekeeping",
  "Maintenance",
];

/**
 * The demo dataset is pinned to the frozen demo week; live defaults to the
 * current week resolved in the workspace timezone.
 */
export function defaultPeriod(source: "live" | "demo", workspaceTimezone: string): ReviewPeriod {
  return source === "demo"
    ? weekPeriodOf(DEMO_WORLD.weeks.current.startIso)
    : currentWeekPeriod(new Date(), workspaceTimezone);
}

interface Props {
  period: ReviewPeriod;
  setPeriod: React.Dispatch<React.SetStateAction<ReviewPeriod>>;
  source: "live" | "demo";
  /** Workspace default timezone; anchors the "This week" boundary. */
  workspaceTimezone: string;
  team: string;
  teamOptions: string[];
  setTeam: (team: string) => void;
  onOpenAssistant: () => void;
  onExport: () => void;
  canExport: boolean;
  onApproveAllPending: () => void;
  /** Live mode only — omitted in demo mode, where manual entry isn't wired. */
  onAddEntry?: () => void;
}

export function TimeHeaderActions({
  period,
  setPeriod,
  source,
  workspaceTimezone,
  team,
  teamOptions,
  setTeam,
  onOpenAssistant,
  onExport,
  canExport,
  onApproveAllPending,
  onAddEntry,
}: Props) {
  return (
    <>
      <RowActionMenu
        triggerLabel="Change review period"
        trigger={
          <button
            type="button"
            className="btn secondary sm"
            aria-label={`Review period ${period.label}`}
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {period.label}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        }
        items={[
          { kind: "label", text: "Review period" },
          { label: "Previous week", onSelect: () => setPeriod((p) => shiftPeriod(p, -1)) },
          {
            label: "This week",
            onSelect: () => setPeriod(defaultPeriod(source, workspaceTimezone)),
          },
          { label: "Next week", onSelect: () => setPeriod((p) => shiftPeriod(p, 1)) },
        ]}
      />
      {source === "demo" && (
        <span className="badge" title="Showing the offline demo dataset">
          Demo data
        </span>
      )}
      <RowActionMenu
        triggerLabel="Filter by team"
        trigger={
          <button type="button" className="btn secondary sm">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {team}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        }
        items={[
          { kind: "label", text: "Department" },
          ...teamOptions.map((t) => ({
            label: t,
            icon: t === team ? Check : undefined,
            onSelect: () => {
              setTeam(t);
              toast.info("Team filter", { description: `Showing ${t.toLowerCase()}.` });
            },
          })),
        ]}
      />
      {onAddEntry && (
        <ActionButton icon={Plus} onClick={onAddEntry} title="Record actual worked time">
          Add time entry
        </ActionButton>
      )}
      <ActionButton variant="outline" icon={Sparkles} onClick={onOpenAssistant}>
        Manager support
      </ActionButton>
      <ActionButton
        icon={Download}
        onClick={onExport}
        disabled={!canExport}
        title={canExport ? "Export approved hours CSV" : "No approved rows ready to export"}
      >
        Export approved hours
      </ActionButton>
      <RowActionMenu
        triggerLabel="More actions"
        items={[
          {
            label: "Approve all eligible pending",
            icon: CheckCircle2,
            onSelect: onApproveAllPending,
          },
        ]}
      />
    </>
  );
}
