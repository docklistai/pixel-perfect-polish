import * as React from "react";
import { HelpCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ActionButton, DialogShell, FormRow } from "@/components/dl";
import { raiseHoursQueryFn } from "../api/raiseHoursQuery";
import type { ClockEntry } from "../types";

interface Props {
  entry: ClockEntry | null;
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  staffMemberId: string | null;
}

const ISSUE_OPTIONS = [
  { value: "missing_clock_out", label: "Missing clock-out" },
  { value: "incorrect_times", label: "Incorrect clock-in or clock-out times" },
  { value: "incorrect_break", label: "Incorrect break duration" },
  { value: "missing_shift", label: "Missing shift / hours not recorded" },
  { value: "other", label: "Other question about recorded hours" },
] as const;

export function PortalHoursQueryDialog({
  entry,
  open,
  onClose,
  workspaceId,
  staffMemberId,
}: Props) {
  const queryClient = useQueryClient();
  const [issueType, setIssueType] = React.useState<string>("incorrect_times");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && entry) {
      setIssueType(entry.flag === "missing-clock-out" ? "missing_clock_out" : "incorrect_times");
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [open, entry]);

  if (!entry) return null;

  const handleSubmit = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Please explain what looks incorrect with your recorded hours.");
      return;
    }
    setError(null);

    // If live workspace & staff member exist, submit to database
    if (workspaceId && staffMemberId) {
      setIsSubmitting(true);
      try {
        const res = await raiseHoursQueryFn({
          data: {
            workspaceId,
            timeEntryId: entry.id,
            issueType: issueType as
              | "missing_clock_out"
              | "incorrect_times"
              | "incorrect_break"
              | "missing_shift"
              | "other",
            note: trimmed,
          },
        });

        if (!res.ok) {
          setError(res.message);
          toast.error("Couldn't submit hours query", { description: res.message });
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: ["portal", "time-entries", workspaceId, staffMemberId],
        });
        toast.success("Hours query submitted", {
          description: "Your manager has been notified and will review your recorded hours.",
        });
        onClose();
      } catch {
        setError("We couldn't submit your query. Please check your connection and try again.");
        toast.error("Couldn't submit hours query");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Demo mode fallback
      toast.success("Hours query submitted", {
        description: "Your query has been recorded for manager review.",
      });
      onClose();
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Query hours — ${entry.dayLabel}`}
      description={`Recorded: ${entry.clockIn} – ${entry.clockOut ?? "No clock-out"} (${entry.totalHours ?? 0}h). Ask your manager to verify your hours.`}
      icon={HelpCircle}
      iconTone="brand"
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </ActionButton>
          <ActionButton size="sm" onClick={handleSubmit} disabled={isSubmitting || !note.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {isSubmitting ? "Submitting…" : "Submit query"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <FormRow label="What needs correcting?" htmlFor="query-issue-type">
          <select
            id="query-issue-type"
            className="select w-full"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
            disabled={isSubmitting}
          >
            {ISSUE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow
          label="Explanation *"
          htmlFor="query-note"
          hint={
            error ? undefined : "Include times or context to help your manager correct the record."
          }
        >
          <textarea
            id="query-note"
            className="textarea w-full"
            rows={3}
            placeholder="e.g. I clocked out at 22:30 with manager permission, but only 22:00 was recorded."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError(null);
            }}
            disabled={isSubmitting}
            autoFocus
          />
        </FormRow>

        {error && (
          <p className="text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Your manager will review your query and make any needed adjustments. Docklist tracks hours
          only.
        </p>
      </div>
    </DialogShell>
  );
}
