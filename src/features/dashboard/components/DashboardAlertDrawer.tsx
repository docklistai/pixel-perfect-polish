import { DrawerShell, ActionButton, StatusBadge, toneSoft } from "@/components/dl";
import type { Tone } from "@/components/dl";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { AttentionItem } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AttentionItem[];
  selectedIndex: number;
}

// Driven entirely by the live attention items that opened it, so the drawer
// can never contradict the dashboard card or show fabricated detail.
export function DashboardAlertDrawer({ open, onOpenChange, items, selectedIndex }: Props) {
  const navigate = useNavigate();
  const active = items[selectedIndex] ?? items[0];
  const Icon = active?.icon ?? AlertTriangle;
  const tone = (active?.tone ?? "warning") as Tone;
  const badgeTone: Tone = tone === "purple" ? "info" : tone;

  const handleCta = () => {
    onOpenChange(false);
    if (active?.route) navigate({ to: active.route });
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={active?.t ?? "Attention"}
      description={active?.s}
      meta={active?.tag ? <StatusBadge tone={badgeTone}>{active.tag}</StatusBadge> : undefined}
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          {active?.cta && active?.route && (
            <ActionButton onClick={handleCta}>
              {active.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </ActionButton>
          )}
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneSoft[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {active?.detail ?? active?.s}
        </p>
      </div>
    </DrawerShell>
  );
}
