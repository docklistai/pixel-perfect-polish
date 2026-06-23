import { useNavigate } from "@tanstack/react-router";
import { Card, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { opsBriefings, opsChecklists, opsDepartmentCoverage } from "../data/opsDemoData";
import { notifyOpsPreview } from "../lib/opsPreview";

export function OpsRightRail() {
  const navigate = useNavigate();

  return (
    <aside className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center">
          <h2 className="text-sm font-semibold">On shift now</h2>
          <span className="badge outline ml-auto">Sample</span>
        </div>
        <div className="mt-3 flex items-end gap-4">
          <div>
            <div className="text-[28px] font-bold leading-none tracking-tight">48</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Staff on duty</div>
          </div>
          <CoverageRing percentage={96} />
          <div>
            <div className="text-sm font-semibold text-success">96%</div>
            <div className="text-[11px] text-muted-foreground">Coverage</div>
          </div>
        </div>
        <div className="my-3 h-px bg-border" />
        <div className="space-y-1">
          {opsDepartmentCoverage.map((item) => (
            <button
              key={item.department}
              type="button"
              onClick={() => navigate({ to: "/rota" })}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs transition-colors hover:bg-muted/40"
            >
              <span className="size-1.5 rounded-full" style={{ background: item.color }} />
              <span className="min-w-0 flex-1">{item.department}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center px-4 py-3">
          <h2 className="text-sm font-semibold">Today&apos;s briefings</h2>
          <StatusBadge tone="purple" className="ml-auto">
            2 posted
          </StatusBadge>
        </div>
        {opsBriefings.map((briefing) => (
          <button
            key={briefing.title}
            type="button"
            onClick={() => notifyOpsPreview("Opening briefings")}
            className="w-full border-t border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
          >
            <div className="text-xs font-semibold">{briefing.title}</div>
            <div className="text-[10px] text-muted-foreground">{briefing.by}</div>
            <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{briefing.body}</p>
            <StatusBadge tone={briefing.tone} className="mt-2">
              Read {briefing.read}
            </StatusBadge>
          </button>
        ))}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Checklists</h2>
        <div className="space-y-3">
          {opsChecklists.map((checklist) => (
            <button
              key={checklist.name}
              type="button"
              onClick={() => notifyOpsPreview("Opening checklists")}
              className="block w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                  {checklist.name}
                </span>
                <StatusBadge tone={checklist.tone}>{checklist.status}</StatusBadge>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    checklist.tone === "success"
                      ? "bg-success"
                      : checklist.tone === "warning"
                        ? "bg-warning"
                        : "bg-muted-foreground/30",
                  )}
                  style={{ width: `${checklist.progress}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </Card>
    </aside>
  );
}

function CoverageRing({ percentage }: { percentage: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dash = (percentage / 100) * circumference;

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-label={`${percentage}% coverage`}>
      <circle cx="26" cy="26" r={radius} stroke="var(--border)" strokeWidth="5" fill="none" />
      <circle
        cx="26"
        cy="26"
        r={radius}
        stroke="var(--teal-500)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink-900)">
        {percentage}%
      </text>
    </svg>
  );
}
