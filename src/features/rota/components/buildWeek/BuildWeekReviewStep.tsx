import * as React from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Info, ShieldCheck } from "lucide-react";
import { FormSection } from "@/components/dl";
import { formatShiftTime } from "../../lib/draftRota";
import type { BuildWeekProposalBody, ShiftSignatureLike } from "./reviewTypes";

/**
 * Step 3 — the proposal, rendered exactly as it was issued.
 *
 * This component computes nothing. Every number and every reason shown here came
 * from the planner, which is what makes "apply exactly what you reviewed" true
 * rather than merely intended.
 */

function describeShift(signature: ShiftSignatureLike): string {
  const times = formatShiftTime(signature.startLocal, signature.endLocal);
  return `${signature.workDate} · ${times}${signature.overnight ? " (overnight)" : ""}`;
}

function SectionCount({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}>{children}</span>
  );
}

export function BuildWeekReviewStep({ proposal }: { proposal: BuildWeekProposalBody }) {
  const { sections, warnings } = proposal;
  const totalCreate = sections.missingDemand.reduce((sum, group) => sum + group.create, 0);

  if (proposal.operations.length === 0 && warnings.length === 0) {
    return (
      <FormSection title="Nothing to do">
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/25 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="text-xs text-muted-foreground">
            This week already matches the source you chose, and every open shift already has someone
            eligible assigned. There is nothing for Build to add.
          </p>
        </div>
      </FormSection>
    );
  }

  return (
    <>
      <FormSection
        title="Shifts to create"
        description={
          totalCreate > 0
            ? "Demand your source asks for that this week does not have yet."
            : "Nothing is missing — the week already has every shift the source asks for."
        }
      >
        {totalCreate === 0 ? (
          <p className="text-xs text-muted-foreground">No new shifts needed.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {sections.missingDemand.map((group) => (
              <li
                key={`${group.signature.workDate}-${group.signature.startLocal}-${group.signature.roleKey}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/25 p-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{group.signature.roleKey}</span>
                  <span className="block text-xs text-muted-foreground">
                    {describeShift(group.signature)}
                  </span>
                </span>
                <SectionCount tone="bg-brand-soft text-brand">+{group.create}</SectionCount>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection
        title={`People proposed (${sections.proposedAssignments.length})`}
        description="Each one holds the role and is free of leave, availability blocks and other shifts."
      >
        {sections.proposedAssignments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No assignments proposed — every shift below stays open.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {sections.proposedAssignments.map((assignment, index) => (
              <li
                key={`${assignment.staffId}-${index}`}
                className="rounded-lg border border-border bg-muted/25 p-2"
              >
                <div className="font-medium">{assignment.staffName}</div>
                <div className="text-xs text-muted-foreground">
                  {assignment.signature.roleKey} · {describeShift(assignment.signature)}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{assignment.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormSection title="What Build will not touch">
        <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success-soft/30 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {sections.preserved.assignedShifts} assigned
            </span>{" "}
            and{" "}
            <span className="font-semibold text-foreground">
              {sections.preserved.openShifts} open
            </span>{" "}
            shifts already in this week stay exactly as they are. Build never deletes a shift and
            never changes one that already has someone on it.
            {sections.preserved.openShiftsBeingAssigned > 0 && (
              <>
                {" "}
                {sections.preserved.openShiftsBeingAssigned} of the open ones would have someone
                assigned to them.
              </>
            )}
          </p>
        </div>
      </FormSection>

      {sections.unresolvedOpen.length > 0 && (
        <FormSection
          title={`Staying open (${sections.unresolvedOpen.length})`}
          description="Nobody eligible is free for these, so they are left for you to fill."
        >
          <ul className="flex flex-col gap-1.5 text-sm">
            {sections.unresolvedOpen.map((gap, index) => (
              <li
                key={`${gap.shiftId ?? "new"}-${index}`}
                className="rounded-lg border border-warning/30 bg-warning-soft/40 p-2"
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {gap.signature.roleKey}
                </div>
                <div className="text-xs text-muted-foreground">{describeShift(gap.signature)}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{gap.reason}</div>
              </li>
            ))}
          </ul>
        </FormSection>
      )}

      {warnings.length > 0 && (
        <FormSection title={`Worth knowing (${warnings.length})`}>
          <ul className="flex flex-col gap-1.5 text-sm">
            {warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${index}`}
                className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                <span className="text-xs text-muted-foreground">{warning.message}</span>
              </li>
            ))}
          </ul>
        </FormSection>
      )}

      <FormSection title="How this was decided">
        <ul className="flex flex-col gap-1.5">
          {proposal.explanations.map((line) => (
            <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          These are draft staffing suggestions based on roles, leave and availability. This is not
          an optimised rota — contracted hours only break ties, and rest gaps and weekly
          working-time limits are not modelled. Review the week before publishing.
        </p>
      </FormSection>
    </>
  );
}
