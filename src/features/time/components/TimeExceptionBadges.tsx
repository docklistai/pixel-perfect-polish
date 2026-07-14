import { StatusBadge } from "@/components/dl";
import { TIME_EXCEPTION_DEFINITIONS, type TimeExceptionCode } from "../lib/timeExceptions";

interface Props {
  codes?: TimeExceptionCode[];
  legacyLabel?: string;
}

export function TimeExceptionBadges({ codes, legacyLabel }: Props) {
  if (codes) {
    if (codes.length > 0) {
      return (
        <span className="inline-flex max-w-52 flex-wrap gap-1">
          {codes.map((code) => {
            const definition = TIME_EXCEPTION_DEFINITIONS[code];
            return (
              <StatusBadge key={code} tone={definition.tone}>
                {definition.label}
              </StatusBadge>
            );
          })}
        </span>
      );
    }
    return <span className="text-muted-foreground">None</span>;
  }
  if (legacyLabel && legacyLabel !== "—") {
    return <StatusBadge tone="warning">{legacyLabel}</StatusBadge>;
  }
  return <span className="text-muted-foreground">—</span>;
}
