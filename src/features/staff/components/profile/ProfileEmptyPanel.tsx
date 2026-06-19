import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { ProfileCard } from "./ProfileCard";

interface ProfileEmptyPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional secondary line, e.g. where the data will come from. */
  hint?: string;
}

/**
 * Honest empty state for a profile tab that has no records yet. Used for live
 * workspace members whose rota, time, leave, or work-pattern history has not
 * been generated — no figures are invented to fill the space.
 */
export function ProfileEmptyPanel({
  icon: Icon,
  title,
  description,
  hint,
}: ProfileEmptyPanelProps) {
  return (
    <ProfileCard title={title}>
      <div className="rounded-2xl border border-dashed border-border/50 bg-[var(--bg-raised)] px-4 py-10 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
        {hint ? (
          <p className="mx-auto mt-2 max-w-sm text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </ProfileCard>
  );
}
