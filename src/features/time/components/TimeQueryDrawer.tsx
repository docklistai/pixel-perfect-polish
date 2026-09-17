import * as React from "react";
import { Check, ChevronRight, Clock, Edit3, X } from "lucide-react";
import { ActionButton, DetailRow, DrawerShell, FormSection, StatusBadge } from "@/components/dl";
import type { TimeQuery } from "../types";

interface Props {
  query: TimeQuery | null;
  onClose: () => void;
  onOpenTimesheet: () => void;
  onAddAdjustment: () => void;
  onResolve?: (query: TimeQuery, note?: string) => Promise<void> | void;
  onDismiss?: (query: TimeQuery, note?: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function TimeQueryDrawer({
  query,
  onClose,
  onOpenTimesheet,
  onAddAdjustment,
  onResolve,
  onDismiss,
  isSubmitting = false,
}: Props) {
  const [resolutionNote, setResolutionNote] = React.useState("");

  React.useEffect(() => {
    setResolutionNote("");
  }, [query]);

  if (!query) return null;

  const [queryType, queryDate] = query.t.includes("—")
    ? query.t.split("—").map((s) => s.trim())
    : ["Hours query", query.t];

  const quickActions = [
    { label: "Open timesheet entry", icon: Clock, onClick: onOpenTimesheet },
    { label: "Add adjustment", icon: Edit3, onClick: onAddAdjustment },
  ];

  const isPending = query.st === "Pending";

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
          <ActionButton variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Close
          </ActionButton>
          {isPending && onDismiss && (
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => onDismiss(query, resolutionNote)}
              disabled={isSubmitting}
            >
              <X className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Dismiss
            </ActionButton>
          )}
          {isPending && onResolve && (
            <ActionButton
              size="sm"
              onClick={() => onResolve(query, resolutionNote)}
              disabled={isSubmitting}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Resolve query
            </ActionButton>
          )}
        </>
      }
    >
      <FormSection title="Query details">
        <dl className="divide-y divide-border">
          <DetailRow label="Raised by" value={query.n} />
          <DetailRow label="Shift / date" value={queryDate} />
          <DetailRow label="Query type" value={queryType} />
          <DetailRow label="Status" value={query.st} />
          <DetailRow label="Staff note" value={query.note || "None provided"} />
          {query.resolutionNote && (
            <DetailRow label="Resolution note" value={query.resolutionNote} />
          )}
          <DetailRow label="Owner" value="Manager review" />
        </dl>
      </FormSection>

      {isPending && onResolve && (
        <FormSection title="Resolution note" className="mt-4">
          <textarea
            className="textarea w-full"
            rows={2}
            placeholder="Optional note sent to staff member (e.g. Added 30m adjustment to clock-out)."
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            disabled={isSubmitting}
          />
        </FormSection>
      )}

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
