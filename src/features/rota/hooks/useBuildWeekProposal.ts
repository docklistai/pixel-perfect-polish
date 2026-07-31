import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildWeekProposalFn, type BuildWeekProposalResult } from "../api/buildWeekProposal";
import { applyBuildWeekProposalFn } from "../api/applyBuildWeekProposal";
import { buildApplyRequestFor } from "../lib/scheduling/buildWeekApplyRequest";

/**
 * Owns the Build the Week proposal lifecycle: request one, hold exactly it, apply
 * exactly it.
 *
 * The proposal is never modified after it arrives. Apply sends the same object
 * back, so there is no second computation that could disagree with what the
 * manager reviewed.
 */

export type BuildWeekSourceChoice =
  | { kind: "template"; templateId: string; label: string }
  | { kind: "previous-week-pattern" }
  | { kind: "current-week" };

type IssuedProposal = Extract<BuildWeekProposalResult, { ok: true }>;

export function useBuildWeekProposal({
  weekOffset,
  locationId,
  onApplied,
}: {
  weekOffset: number;
  locationId: string | null;
  /** Fired after a successful apply, so the caller can reset undo history. */
  onApplied: () => void;
}) {
  const queryClient = useQueryClient();
  const [proposal, setProposal] = React.useState<IssuedProposal | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setProposal(null);
    setError(null);
    setLoading(false);
    setApplying(false);
  }, []);

  const request = React.useCallback(
    async (source: BuildWeekSourceChoice) => {
      setLoading(true);
      setError(null);
      setProposal(null);
      try {
        const result = await buildWeekProposalFn({
          data: {
            weekOffset,
            ...(locationId ? { locationId } : {}),
            source:
              source.kind === "template"
                ? { kind: "template", templateId: source.templateId }
                : { kind: source.kind },
          },
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setProposal(result);
      } catch {
        setError("The proposal could not be built. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [locationId, weekOffset],
  );

  const apply = React.useCallback(async (): Promise<boolean> => {
    if (!proposal) return false;
    setApplying(true);
    setError(null);
    try {
      // Echoed back exactly as it was issued — see buildApplyRequestFor.
      const result = await applyBuildWeekProposalFn({
        data: buildApplyRequestFor(proposal),
      });
      if (!result.ok) {
        // A refusal is the safe outcome, not a failure to hide: nothing was
        // written, and the manager needs the reason to decide what to do next.
        setError(result.message);
        return false;
      }
      await queryClient.invalidateQueries({ queryKey: ["rota", "workspace-week"] });
      // Build cannot be reversed by one Undo, so the stack is dropped rather
      // than left holding inverses that no longer describe this week.
      onApplied();
      toast.success("Week built", {
        description: `${result.createdOpen + result.createdAssigned} shifts added, ${result.assignedExisting} open shifts assigned. This is still a draft — nothing is published.`,
      });
      return true;
    } catch {
      setError("This week was not built. Nothing was applied — try again.");
      return false;
    } finally {
      setApplying(false);
    }
  }, [onApplied, proposal, queryClient]);

  return { proposal, loading, applying, error, request, apply, reset };
}
