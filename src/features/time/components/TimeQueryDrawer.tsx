import { Check, ChevronRight, Clock, Edit3, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DrawerShell, ActionButton, StatusBadge, FormSection, DetailRow } from "@/components/dl";
import type { TimeQuery } from "../types";

interface Props {
  query: TimeQuery | null;
  onClose: () => void;
  onOpenTimesheet: () => void;
  onAddAdjustment: () => void;
}

/** Staff hours-query drawer — prototype parity. Demo-only resolution flows. */
export function TimeQueryDrawer({ query, onClose, onOpenTimesheet, onAddAdjustment }: Props) {
  if (!query) return null;

  const [queryType, queryDate] = query.t.includes("—")
    ? query.t.split("—").map((s) => s.trim())
    : ["Hours query", query.t];

  const quickActions = [
    { label: "Open timesheet entry", icon: Clock, onClick: onOpenTimesheet },
    { label: "Add adjustment", icon: Edit3, onClick: onAddAdjustment },
    {
      label: "Review full timesheet",
      icon: ExternalLink,
      onClick: () => {
        onClose();
        toast.info("Timesheet", {
          description: `${query.n}'s full timesheet shown in the table.`,
        });
      },
    },
  ];

  return (
    <DrawerShell
      open={!!query}
      onOpenChange={(o) => !o && onClose()}
      title={`Hours query — ${query.n}`}
      description={query.t}
      meta={
        <StatusBadge tone={query.stTone === "danger" ? "danger" : "info"}>{query.st}</StatusBadge>
      }
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={onClose}>
            Close
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => {
              onClose();
              toast.info("Kept under review", {
                description: `${query.n}'s query stays open — revisit when the timesheet is reviewed.`,
              });
            }}
          >
            Keep under review
          </ActionButton>
          <ActionButton
            size="sm"
            onClick={() => {
              onClose();
              toast.success("Query resolved", {
                description: `${query.n}'s hours query marked as resolved.`,
              });
            }}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" /> Mark resolved
          </ActionButton>
        </>
      }
    >
      <FormSection title="Query details">
        <dl className="divide-y divide-border">
          <DetailRow label="Raised by" value={query.n} />
          <DetailRow label="Shift / date" value={queryDate} />
          <DetailRow label="Query type" value={queryType} />
          <DetailRow label="Status" value={query.st} />
          <DetailRow label="Owner" value="Manager review" />
        </dl>
      </FormSection>

      <div className="mt-4 space-y-2">
        {quickActions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <a.icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="flex-1 text-sm font-semibold">{a.label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </DrawerShell>
  );
}
