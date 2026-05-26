import { Sparkles } from "lucide-react";

export function AiDrawerHeader() {
  return (
    <span className="flex items-center gap-3">
      <span className="bubble teal" style={{ width: 32, height: 32 }} aria-hidden>
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <span>
        <span className="block">Docklist assistant</span>
        <span className="block text-xs font-normal" style={{ color: "var(--ink-500)" }}>
          Practical manager support · review before acting
        </span>
      </span>
    </span>
  );
}
