import * as React from "react";
import { DrawerShell } from "@/components/dl";
import { AiChip } from "./AiChip";
import { AiDrawerBody } from "./AiDrawerBody";
import { AiDrawerHeader } from "./AiDrawerHeader";
import { ANSWERS, type Phase, type SimulatedAnswer } from "./aiDrawerData";

export function AiDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [input, setInput] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [answer, setAnswer] = React.useState<SimulatedAnswer | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

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

  const run = (q: string) => {
    setInput(q);
    setAnswer(null);
    setPhase("running");
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setPhase("answered");
      setAnswer(ANSWERS[q] ?? ANSWERS.default);
      timeoutRef.current = null;
    }, 900);
  };

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
