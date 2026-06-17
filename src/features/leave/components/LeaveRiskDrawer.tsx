import { CalendarDays } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { DrawerShell, FormSection, StatusBadge, ActionButton } from "@/components/dl";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Coverage-risk aid for a flagged leave window. This demo build has no live
 * coverage forecast, so it does not invent staffing numbers — it explains what
 * to check and routes the manager to the rota to confirm coverage themselves.
 */
export function LeaveRiskDrawer({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Coverage check — Bar"
      description="Sat 13 Jun 2026"
      meta={<StatusBadge tone="muted">Review</StatusBadge>}
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton
            icon={CalendarDays}
            onClick={() => {
              onOpenChange(false);
              void navigate({ to: "/rota" });
            }}
          >
            Open rota
          </ActionButton>
        </>
      }
    >
      <FormSection title="What to check">
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li>Who is still scheduled on Bar for this date once leave is approved.</li>
          <li>Whether any shifts would be left open or under-covered.</li>
          <li>If a colleague in the same role is available to swap in.</li>
        </ul>
      </FormSection>
      <p className="text-[11px] text-muted-foreground">
        Not enough data here for a coverage figure — open the rota to confirm. Preview only; no rota
        change is applied.
      </p>
    </DrawerShell>
  );
}
