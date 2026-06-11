import { Card } from "@/components/dl";
import { AiSuggestionCard } from "@/components/ai/AiSuggestionCard";
import { Plus, Sparkles } from "lucide-react";

interface Props {
  onOpenAssistant?: () => void;
}

export function LeaveRightRail({ onOpenAssistant }: Props = {}) {
  return (
    <div className="col-span-12 lg:col-span-3 space-y-4">
      <AiSuggestionCard
        tone="teal"
        title="Three low-impact requests look safe to approve"
        body="Sophie, Olivia and one other request fall on weeks with full coverage and within balance. Worth a quick review."
        actions={[
          {
            label: "Open assistant",
            primary: true,
            icon: <Sparkles className="h-3.5 w-3.5" aria-hidden />,
            onClick: onOpenAssistant,
          },
        ]}
      />

      <Card className="rounded-2xl p-5">
        <div className="text-sm font-semibold mb-1">MANAGER AVAILABILITY</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Availability editing is not available in this preview yet.
        </p>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Recurring availability</div>
          <button
            type="button"
            className="text-xs text-brand opacity-50 cursor-not-allowed"
            disabled
            aria-disabled="true"
          >
            Edit
          </button>
        </div>
        {[
          ["Mon", "Unavailable"],
          ["Tue", "09:00 – 17:00"],
          ["Wed", "09:00 – 17:00"],
          ["Thu", "Unavailable"],
          ["Fri", "09:00 – 17:00"],
          ["Sat", "10:00 – 16:00"],
          ["Sun", "Unavailable"],
        ].map(([d, v]) => (
          <div key={d} className="flex justify-between text-xs py-1">
            <span className="font-medium">{d}</span>
            <span className="text-muted-foreground">{v}</span>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs font-semibold">Unavailable dates</div>
          <button
            type="button"
            className="text-xs text-brand flex items-center gap-1 opacity-50 cursor-not-allowed"
            disabled
            aria-disabled="true"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="mt-1 text-xs space-y-1">
          <div className="flex justify-between">
            <span>14 – 16 Jun 2026</span>
            <span className="text-muted-foreground">Personal</span>
          </div>
          <div className="flex justify-between">
            <span>14 Jun 2026</span>
            <span className="text-muted-foreground">All day</span>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">LEAVE ALERTS</span>
          <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">
            2
          </span>
        </div>
        {[
          {
            l: "!",
            t: "Rota clash",
            s: "Kitchen has limited coverage on 16 Jun 2026.",
            tone: "warning",
          },
          {
            l: "♥",
            t: "High leave period",
            s: "18% of team on leave 14 – 21 Jun 2026.",
            tone: "purple",
          },
        ].map((a) => (
          <div key={a.t} className="flex gap-3 py-2 border-t first:border-t-0 border-border">
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                a.tone === "warning"
                  ? "bg-warning-soft text-warning"
                  : "bg-accent-purple-soft text-accent-purple"
              }`}
            >
              {a.l}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{a.t}</div>
              <div className="text-[11px] text-muted-foreground">{a.s}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
