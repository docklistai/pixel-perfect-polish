import * as React from "react";
import { DrawerShell } from "@/components/dl";
import { AiChip } from "./AiChip";
import { AiDrawerBody } from "./AiDrawerBody";
import { AiDrawerHeader } from "./AiDrawerHeader";
import { type Phase, type SimulatedAnswer } from "./aiDrawerData";
import { matchWorkspaceAnswer, type AiWorkspaceContext } from "./aiWorkspaceAnswers";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";

export function AiDrawer({
  open,
  onOpenChange,
  initialPrompt = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the drawer opens with this prompt already running (prototype "Suggest fix" flows). */
  initialPrompt?: string | null;
}) {
  const [input, setInput] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [answer, setAnswer] = React.useState<SimulatedAnswer | null>(null);
  const timeoutRef = React.useRef<number | null>(null);
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const leaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const timeRows = useWorkspaceSelector((state) => state.timeRows);
  const context = React.useMemo<AiWorkspaceContext>(() => {
    const draft = weekDrafts[String(weekOffset)] ?? weekDrafts["0"];
    return {
      pendingLeaveCount: leaveRequests.filter((request) => request.state === "pending").length,
      approvedLeaveCount: leaveRequests.filter((request) => request.state === "approved").length,
      pendingTimeCount: timeRows.filter((row) => row.status !== "approved").length,
      approvedTimeCount: timeRows.filter((row) => row.status === "approved").length,
      openShiftCount: draft?.shifts.filter((shift) => shift.status === "open").length ?? 0,
    };
  }, [weekDrafts, weekOffset, leaveRequests, timeRows]);

  React.useEffect(() => {
    if (!open) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setInput("");
      setAnswer(null);
      setPhase("idle");
    }
  }, [open]);

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const run = React.useCallback(
    (q: string) => {
      setInput(q);
      setAnswer(null);
      setPhase("running");
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setPhase("answered");
        setAnswer(matchWorkspaceAnswer(q, context));
        timeoutRef.current = null;
      }, 900);
    },
    [context],
  );

  React.useEffect(() => {
    if (open && initialPrompt) {
      run(initialPrompt);
    }
  }, [open, initialPrompt, run]);

  const resetConversation = () => {
    setAnswer(null);
    setInput("");
    setPhase("idle");
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title={<AiDrawerHeader />}
      description={undefined}
      meta={<AiChip />}
    >
      <AiDrawerBody
        input={input}
        phase={phase}
        answer={answer}
        onInputChange={setInput}
        onRun={run}
        onReset={resetConversation}
        onOpenChange={onOpenChange}
      />
    </DrawerShell>
  );
}
