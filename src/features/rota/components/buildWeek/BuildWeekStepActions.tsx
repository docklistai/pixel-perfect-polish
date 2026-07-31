import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { ActionButton } from "@/components/dl";

export type BuildWeekStep = "target" | "source" | "review";

/**
 * What a manager can do at each step of Build the Week.
 *
 * Split out of the drawer so the drawer reads as its three steps and this file
 * answers one question: which action is offered here, and when is it refused.
 * Every rule that keeps the write behind a completed review — no source chosen,
 * no proposal back yet, a proposal with nothing in it — is visible in one place
 * rather than spread down a long footer expression.
 */
export function BuildWeekStepActions({
  step,
  canEdit,
  hasSource,
  hasProposal,
  operationCount,
  loading,
  applying,
  onCancel,
  onStepChange,
  onBuildProposal,
  onChangeSource,
  onApply,
}: {
  step: BuildWeekStep;
  canEdit: boolean;
  hasSource: boolean;
  hasProposal: boolean;
  /** Operations in the reviewed proposal; zero means there is nothing to apply. */
  operationCount: number;
  loading: boolean;
  applying: boolean;
  onCancel: () => void;
  onStepChange: (step: BuildWeekStep) => void;
  onBuildProposal: () => void;
  /** Discards the current proposal and returns to the source step. */
  onChangeSource: () => void;
  onApply: () => void;
}) {
  return (
    <>
      <ActionButton variant="ghost" icon={X} onClick={onCancel}>
        Cancel
      </ActionButton>
      {step === "target" && (
        <ActionButton icon={ArrowRight} disabled={!canEdit} onClick={() => onStepChange("source")}>
          Choose a source
        </ActionButton>
      )}
      {step === "source" && (
        <>
          <ActionButton variant="secondary" icon={ArrowLeft} onClick={() => onStepChange("target")}>
            Back
          </ActionButton>
          <ActionButton icon={ArrowRight} disabled={!hasSource} onClick={onBuildProposal}>
            Build a proposal
          </ActionButton>
        </>
      )}
      {step === "review" && (
        <>
          <ActionButton variant="secondary" icon={ArrowLeft} onClick={onChangeSource}>
            Change source
          </ActionButton>
          <ActionButton
            icon={Check}
            disabled={applying || loading || !hasProposal || operationCount === 0}
            onClick={onApply}
          >
            {applying ? "Applying…" : "Apply to this week"}
          </ActionButton>
        </>
      )}
    </>
  );
}
