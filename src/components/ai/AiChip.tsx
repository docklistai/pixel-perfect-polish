import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** AI brand chip — marks AI-assisted surfaces. Matches prototype .ai-chip. */
export function AiChip({
  size = "md",
  subtle = false,
  label = "AI-assisted",
  className,
}: {
  size?: "sm" | "md";
  subtle?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold", className)}
      style={{
        padding: size === "sm" ? "1px 7px" : "2px 9px",
        fontSize: size === "sm" ? 10 : 11,
        background: subtle ? "transparent" : "var(--st-teal-bg)",
        color: "var(--st-teal-ink)",
        border: "1px solid var(--st-teal-line)",
      }}
    >
      <Sparkles
        style={{
          width: size === "sm" ? 9 : 11,
          height: size === "sm" ? 9 : 11,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}
