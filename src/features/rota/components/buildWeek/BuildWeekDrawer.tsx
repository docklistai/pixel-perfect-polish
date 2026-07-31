import * as React from "react";
import { MapPin } from "lucide-react";
import { DrawerShell, FormSection } from "@/components/dl";
import { useDemandTemplates } from "../../hooks/useDemandTemplates";
import { useBuildWeekProposal, type BuildWeekSourceChoice } from "../../hooks/useBuildWeekProposal";
import { buildWeekAvailability } from "../../lib/serverActionAvailability";
import { BuildWeekSourceStep } from "./BuildWeekSourceStep";
import { BuildWeekReviewStep } from "./BuildWeekReviewStep";
import { BuildWeekStepActions, type BuildWeekStep } from "./BuildWeekStepActions";

/**
 * Build the Week: confirm the target, choose one demand source, review one
 * proposal, apply it atomically.
 *
 * This replaced a menu of four independent actions that each wrote immediately
 * and separately. The steps exist so a manager reaches the write having seen
 * exactly what it will do — and so "no demand source means no generation" is
 * something the flow makes impossible rather than something it checks for.
 *
 * Exact Copy Previous Week is deliberately not here. It duplicates a rota
 * as-is, including who worked it, which is a different intention from rebuilding
 * a week's coverage; it stays its own action in the page header.
 */

export function BuildWeekDrawer({
  open,
  onOpenChange,
  weekLabel,
  locationName,
  weekOffset,
  locationId,
  plannedShiftCount,
  assignedShiftCount,
  openShiftCount,
  canEdit,
  serverBacked,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  locationName: string;
  weekOffset: number;
  locationId: string | null;
  plannedShiftCount: number;
  assignedShiftCount: number;
  openShiftCount: number;
  canEdit: boolean;
  /** False for the offline sample rota, which Build can never run against. */
  serverBacked: boolean;
  /** Called after a successful apply so the caller can reset undo history. */
  onApplied: () => void;
}) {
  const [step, setStep] = React.useState<BuildWeekStep>("target");
  const [source, setSource] = React.useState<BuildWeekSourceChoice | null>(null);
  const templates = useDemandTemplates();
  const build = useBuildWeekProposal({ weekOffset, locationId, onApplied });
  const availability = buildWeekAvailability({ serverBacked, canEdit });

  React.useEffect(() => {
    if (open) return;
    setStep("target");
    setSource(null);
    build.reset();
  }, [build, open]);

  const goToReview = async () => {
    if (!source) return;
    setStep("review");
    await build.request(source);
  };

  const handleApply = async () => {
    const applied = await build.apply();
    if (applied) onOpenChange(false);
  };

  const footer = (
    <BuildWeekStepActions
      step={step}
      canEdit={canEdit}
      hasSource={Boolean(source)}
      hasProposal={Boolean(build.proposal)}
      operationCount={build.proposal?.proposal.operations.length ?? 0}
      loading={build.loading}
      applying={build.applying}
      onCancel={() => onOpenChange(false)}
      onStepChange={setStep}
      onBuildProposal={() => void goToReview()}
      onChangeSource={() => {
        build.reset();
        setStep("source");
      }}
      onApply={() => void handleApply()}
    />
  );

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Build this week"
      description={`${weekLabel} — draft only. Staff see nothing until you publish.`}
      width="lg"
      footer={footer}
    >
      {step === "target" && (
        <FormSection
          title="1. You are building"
          description="Check this is the week and location you meant before going further."
        >
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden />
              {weekLabel} · {locationName}
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Shifts now</dt>
                <dd className="font-semibold">{plannedShiftCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Assigned</dt>
                <dd className="font-semibold">{assignedShiftCount}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Open</dt>
                <dd className="font-semibold">{openShiftCount}</dd>
              </div>
            </dl>
          </div>
          {!availability.available && (
            <p className="mt-2 text-xs text-muted-foreground">{availability.reason}</p>
          )}
        </FormSection>
      )}

      {step === "source" && (
        <BuildWeekSourceStep
          templates={templates.templates}
          templatesLoading={templates.isLoading}
          selected={source}
          onSelect={setSource}
        />
      )}

      {step === "review" && (
        <>
          {build.loading && (
            <FormSection title="Working out what this week needs…">
              <p className="text-sm text-muted-foreground">
                Reading this week, your staff, and their leave and availability.
              </p>
            </FormSection>
          )}
          {build.error && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft/40 p-3 text-sm"
            >
              <div className="font-semibold">Nothing was applied</div>
              <p className="mt-0.5 text-xs text-muted-foreground">{build.error}</p>
            </div>
          )}
          {build.proposal && <BuildWeekReviewStep proposal={build.proposal.proposal} />}
          {build.proposal && build.proposal.proposal.operations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Applying writes all of this at once, or none of it. Build cannot be reversed with a
              single Undo, so your undo history is cleared afterwards — you can still edit every
              shift by hand.
            </p>
          )}
        </>
      )}
    </DrawerShell>
  );
}
