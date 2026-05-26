import * as React from "react";
import { X } from "lucide-react";
import { AiChip } from "./AiChip";

type ProtoTone = "teal" | "amber" | "purple" | "blue" | "red" | "green";

interface AiAction {
  label: string;
  primary?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

/** Small opinionated AI suggestion card. Matches prototype AISuggestionCard. */
export function AiSuggestionCard({
  title,
  body,
  tone = "teal",
  actions = [],
  onDismiss,
}: {
  title: React.ReactNode;
  body: React.ReactNode;
  tone?: ProtoTone;
  actions?: AiAction[];
  onDismiss?: () => void;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: `var(--st-${tone}-bg)`,
        border: `1px solid var(--st-${tone}-line)`,
        position: "relative",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AiChip size="sm" />
        <span className="text-xs" style={{ color: "var(--ink-500)", marginLeft: 4 }}>
          Suggestion · review before acting
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss suggestion"
            className="ml-auto grid place-items-center rounded-md"
            style={{ color: "var(--ink-500)", width: 22, height: 22 }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="font-semibold" style={{ color: `var(--st-${tone}-ink)`, fontSize: 13.5 }}>
        {title}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--ink-500)", lineHeight: 1.5 }}>
        {body}
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`btn sm ${a.primary ? "outline-teal" : "ghost"}`}
              onClick={a.onClick}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
