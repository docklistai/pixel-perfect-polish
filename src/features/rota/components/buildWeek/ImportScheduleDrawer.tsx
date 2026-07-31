import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileUp, X } from "lucide-react";
import { ActionButton, DrawerShell } from "@/components/dl";
import { importScheduleProposalFn } from "../../api/importScheduleProposal";
import { applyBuildWeekProposalFn } from "../../api/applyBuildWeekProposal";
import { importScheduleAvailability } from "../../lib/serverActionAvailability";
import {
  applyLabel,
  applyRequestFor,
  canApply,
  canPreview,
  importDrawerReducer,
  initialImportDrawerState,
  previewLabel,
} from "./importScheduleDrawerState";
import { ImportScheduleForm } from "./ImportScheduleForm";
import { ImportSchedulePreview } from "./ImportSchedulePreview";

/**
 * Import a headed schedule (CSV or TSV) into the current draft week.
 *
 * The paste is parsed and previewed before anything is written, and the import
 * is applied through the same atomic RPC Build the Week uses — so it is
 * all-or-nothing, validated per operation, and audited identically.
 *
 * Every source row appears in the preview. A row that cannot be imported shows
 * why; nothing is dropped quietly.
 *
 * Every decision this drawer makes — what is enabled, what survives a refusal,
 * what is sent to apply — lives in `importScheduleDrawerState.ts`. This file
 * renders that state and nothing else.
 */
export function ImportScheduleDrawer({
  open,
  onOpenChange,
  weekLabel,
  weekOffset,
  locationId,
  serverBacked,
  canEdit,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  weekOffset: number;
  locationId: string | null;
  /** Both calls below are server functions, so these decide whether either runs. */
  serverBacked: boolean;
  canEdit: boolean;
  onApplied: () => void;
}) {
  const queryClient = useQueryClient();
  const [state, dispatch] = React.useReducer(importDrawerReducer, undefined, () =>
    initialImportDrawerState(),
  );
  const availability = importScheduleAvailability({ serverBacked, canEdit });

  React.useEffect(() => {
    if (open) return;
    dispatch({ type: "closed" });
  }, [open]);

  const preview = async () => {
    if (!canPreview(state, availability)) return;
    dispatch({ type: "preview-started" });
    try {
      const result = await importScheduleProposalFn({
        data: {
          weekOffset,
          ...(locationId ? { locationId } : {}),
          text: state.text,
          dateOrder: state.dateOrder,
        },
      });
      dispatch({ type: "preview-returned", result });
    } catch {
      dispatch({ type: "preview-threw" });
    }
  };

  const apply = async () => {
    const reviewed = state.result;
    if (!canApply(state, availability) || !reviewed?.ok) return;
    dispatch({ type: "apply-started" });
    try {
      // The reviewed plan, forwarded unchanged.
      const applied = await applyBuildWeekProposalFn({ data: applyRequestFor(reviewed) });
      if (!applied.ok) {
        dispatch({ type: "apply-refused", message: applied.message });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week"] });
      onApplied();
      toast.success("Schedule imported", {
        description: `${applied.createdOpen + applied.createdAssigned} shifts added to ${weekLabel}. This is still a draft — nothing is published.`,
      });
      onOpenChange(false);
    } catch {
      dispatch({ type: "apply-threw" });
    }
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Import a schedule"
      description={`Paste a headed CSV or TSV for ${weekLabel}. You review everything before it is written.`}
      width="lg"
      footer={
        <>
          <ActionButton variant="ghost" icon={X} onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={FileUp}
            disabled={!canPreview(state, availability)}
            onClick={() => void preview()}
          >
            {previewLabel(state)}
          </ActionButton>
          <ActionButton
            icon={Check}
            disabled={!canApply(state, availability)}
            onClick={() => void apply()}
          >
            {applyLabel(state)}
          </ActionButton>
        </>
      }
    >
      {!availability.available && (
        <p className="rounded-xl border border-border bg-muted/25 p-3 text-xs text-muted-foreground">
          {availability.reason}
        </p>
      )}

      <ImportScheduleForm state={state} dispatch={dispatch} />

      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger-soft/40 p-3 text-sm"
        >
          <div className="font-semibold">Nothing was imported</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{state.error}</p>
        </div>
      )}

      <ImportSchedulePreview state={state} />
    </DrawerShell>
  );
}
