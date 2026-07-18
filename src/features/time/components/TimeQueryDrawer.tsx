import { ChevronRight, Clock, Edit3 } from "lucide-react";
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
        <ActionButton variant="ghost" size="sm" onClick={onClose}>
          Close
        </ActionButton>
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
