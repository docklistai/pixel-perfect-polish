import type { LucideIcon } from "lucide-react";
import { ActionButton, toneSoft, type Tone } from "@/components/dl";

interface ReasoningRowProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  reason: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A single review item: an issue, a plain-English reason, and an optional
 * action that routes into an existing screen. Renders as a list item — keep
 * it inside a <ul>.
 */
export function ReasoningRow({
  icon: Icon,
  tone,
  title,
  reason,
  actionLabel,
  onAction,
}: ReasoningRowProps) {
  return (
    <li className="flex items-start gap-3 rounded-[12px] border border-border px-3 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${toneSoft[tone]}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs leading-5 text-muted-foreground">{reason}</p>
      </div>
      {actionLabel && onAction && (
        <ActionButton
          variant="secondary"
          size="sm"
          className="shrink-0 whitespace-nowrap"
          onClick={onAction}
        >
          {actionLabel}
        </ActionButton>
      )}
    </li>
  );
}
