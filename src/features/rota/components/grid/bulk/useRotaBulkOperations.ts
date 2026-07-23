import * as React from "react";
import { toast } from "sonner";
import { parseRotaTsvClipboard } from "../clipboard/rotaTsvParser";
import { useRotaBulkTargets } from "./useRotaBulkTargets";
import { buildRotaClearPlan } from "./rotaClearPlan";
import { buildRotaPastePlan } from "./rotaPastePlan";
import { buildRotaFillPlan } from "./rotaFillPlan";
import { planIsApplicable, type RotaBulkPlan } from "./rotaBulkPlan";
import {
  buildRetryPlan,
  describeRotaBulkOutcome,
  runRotaBulkPlan,
  type RotaBulkOutcome,
  type RotaBulkRunners,
} from "./runRotaBulkPlan";
import type { RotaGridSelection } from "../selection/useRotaGridSelection";
import type { RotaGridOpenRow, RotaGridStaffRow } from "../../../types";
import { useRotaBulkRefresh } from "./useRotaBulkRefresh";

/** Lets the refetched week reach the component tree before it is read back. */
const settle = () => new Promise(requestAnimationFrame);

export function useRotaBulkOperations({
  selection,
  staffRows,
  openRow,
  dayLabels,
  workspaceRoles,
  runners,
  readOnly,
  weekIsEditable,
  onBlocked,
  announce,
}: {
  selection: RotaGridSelection;
  staffRows: readonly RotaGridStaffRow[];
  openRow: RotaGridOpenRow;
  dayLabels: readonly string[];
  workspaceRoles?: readonly string[];
  runners: RotaBulkRunners;
  readOnly: boolean;
  /** False for archived weeks, which refuse every write server-side anyway. */
  weekIsEditable: boolean;
  onBlocked: () => void;
  announce: (message: string) => void;
}) {
  const [plan, setPlan] = React.useState<RotaBulkPlan | null>(null);
  const [outcome, setOutcome] = React.useState<RotaBulkOutcome | null>(null);
  const [running, setRunning] = React.useState(false);
  const refresh = useRotaBulkRefresh(runners, setOutcome, setRunning, announce);

  const targets = useRotaBulkTargets({ selection, staffRows, openRow, dayLabels });
  // The rectangle the open plan was built from. A paste can reach past the
  // selection, so the drift check has to re-read that rectangle rather than
  // whatever happens to be selected when the manager confirms.
  const planRectRef = React.useRef(targets.rect);

  const canOperate = selection.enabled && selection.rect !== null && targets.rows.length > 0;

  const openPlan = React.useCallback(
    (next: RotaBulkPlan) => {
      setOutcome(null);
      setPlan(next);
      if (next.blockers.length > 0) {
        announce(`${next.blockers.length} cells block this change. Nothing was applied.`);
      }
    },
    [announce],
  );

  const guard = React.useCallback((): boolean => {
    if (readOnly) {
      onBlocked();
      return false;
    }
    if (!weekIsEditable) {
      toast.info("This week cannot be edited", {
        description: "Archived rota weeks are read only.",
      });
      return false;
    }
    return true;
  }, [onBlocked, readOnly, weekIsEditable]);

  const requestClear = React.useCallback(() => {
    if (!canOperate || !guard()) return;
    planRectRef.current = targets.rect;
    openPlan(buildRotaClearPlan(targets.rows.flat()));
  }, [canOperate, guard, openPlan, targets]);

  const requestFill = React.useCallback(
    (direction: "down" | "right") => {
      if (!canOperate || !guard()) return;
      planRectRef.current = targets.rect;
      openPlan(buildRotaFillPlan({ rows: targets.rows, direction, workspaceRoles }));
    },
    [canOperate, guard, openPlan, targets, workspaceRoles],
  );

  const requestPaste = React.useCallback(
    (text: string) => {
      if (!canOperate || !guard()) return;
      const parsed = parseRotaTsvClipboard(text);
      if (!parsed.ok) {
        toast.error("Nothing pasted", { description: parsed.message });
        announce(`Paste blocked. ${parsed.message}`);
        return;
      }
      // The block lands from the active cell outwards, so the targets are its
      // shape rather than the selection's.
      const rect = targets.rectForPastedBlock(parsed.rows.length, parsed.rows[0]?.length ?? 0);
      planRectRef.current = rect;
      openPlan(
        buildRotaPastePlan({
          geometry: { rows: targets.forRect(rect) },
          pasted: parsed.rows,
          workspaceRoles,
        }),
      );
    },
    [announce, canOperate, guard, openPlan, targets, workspaceRoles],
  );

  const execute = React.useCallback(
    async (target: RotaBulkPlan) => {
      setRunning(true);
      try {
        const result = await runRotaBulkPlan(target, runners, {
          currentSignature: async (fresh) => {
            if (fresh) return targets.signatureForFresh(planRectRef.current, fresh);
            await settle();
            return targets.signatureFor(planRectRef.current);
          },
        });
        setOutcome(result);
        announce(describeRotaBulkOutcome(result));
      } finally {
        setRunning(false);
      }
    },
    [announce, runners, targets],
  );

  const confirm = React.useCallback(() => {
    if (!plan || !planIsApplicable(plan)) return;
    void execute(plan);
  }, [execute, plan]);

  const retryFailed = React.useCallback(() => {
    if (!plan || !outcome) return;
    // Rebuilt against the week as it stands after the partial run, and resumed
    // rather than restarted so an already-created shift is not duplicated.
    const retry = buildRetryPlan(plan, outcome, targets.signatureFor(planRectRef.current));
    setPlan(retry);
    setOutcome(null);
    void execute(retry);
  }, [execute, outcome, plan, targets]);

  const close = React.useCallback(() => {
    setPlan(null);
    setOutcome(null);
  }, []);

  return {
    canOperate,
    requestClear,
    requestFill,
    requestPaste,
    dialog: {
      open: plan !== null,
      plan,
      outcome,
      running,
      onOpenChange: (next: boolean) => (next ? undefined : close()),
      onConfirm: confirm,
      onRetryFailed: retryFailed,
      onRefresh: refresh,
    },
  };
}
