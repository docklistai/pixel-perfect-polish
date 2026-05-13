import { Card, StatusBadge, ActionButton } from "@/components/dl";

export function LabourSummaryCard({ onViewAnalysis }: { onViewAnalysis: () => void }) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Labour summary</div>
        <StatusBadge tone="muted">This week</StatusBadge>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="oklch(0.92 0.01 240)"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="226"
              strokeDashoffset="5"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-[24px] font-semibold tracking-tight">802h</div>
            <div className="text-[10px] text-muted-foreground">Coverage 98%</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Total scheduled</div>
            <div className="text-[18px] font-semibold">802h</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Target</div>
            <div className="text-[18px] font-semibold">820h</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Budget</div>
            <div className="text-[18px] font-semibold text-brand">On track</div>
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[98%] bg-brand" />
      </div>
      <ActionButton
        variant="ghost"
        size="sm"
        className="mt-3 px-0 text-xs font-semibold text-brand"
        onClick={onViewAnalysis}
      >
        View full analysis
      </ActionButton>
    </Card>
  );
}
