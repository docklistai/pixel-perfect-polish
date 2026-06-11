import * as React from "react";

interface SettingsToggleProps {
  on?: boolean;
  onClick?: () => void;
  "aria-label": string;
}

export function SettingsToggle({
  on = true,
  onClick,
  "aria-label": ariaLabel,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={on}
      className={`inline-flex h-5 w-9 shrink-0 rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${on ? "bg-brand" : "bg-muted"}`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition ${on ? "translate-x-4" : ""}`}
      />
    </button>
  );
}
