import { Loader2 } from "lucide-react";
import { SettingsToggle } from "./SettingsToggle";

/**
 * A Labs switch that reflects persisted workspace state.
 *
 * Deliberately NOT `ToggleRow` from SettingsPrimitives: that one holds its
 * position in local React state and persists nothing, which is only honest on
 * a preview tab. Labs is pilot-visible, so every control here must show what is
 * actually stored and must be unavailable — visibly, not silently — while a
 * save is in flight or the workspace state could not be read.
 */
export function LabsToggleRow({
  label,
  description,
  ariaLabel,
  on,
  onToggle,
  pending = false,
  disabled = false,
}: {
  label: string;
  description: string;
  ariaLabel: string;
  on: boolean;
  onToggle: (next: boolean) => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  const locked = pending || disabled;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs leading-5 text-muted-foreground">{description}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {pending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden />
        )}
        <span
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          aria-hidden
        >
          {on ? "On" : "Off"}
        </span>
        <SettingsToggle
          aria-label={ariaLabel}
          on={on}
          disabled={locked}
          onClick={() => {
            if (locked) return;
            onToggle(!on);
          }}
        />
      </div>
    </div>
  );
}
