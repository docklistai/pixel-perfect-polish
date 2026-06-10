import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewRequest?: () => void;
  requests: LeaveRequest[];
}

type CalendarCell = { d: number; outside: boolean };

type LeaveBand = { who: string; start: number; end: number; state: "approved" | "pending" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = 12;

/** May 2025 — 1 May falls on Thursday, so the grid starts on Mon 28 Apr. */
function buildCells(): CalendarCell[] {
  const cells: CalendarCell[] = [];
  for (let d = 28; d <= 30; d++) cells.push({ d, outside: true });
  for (let d = 1; d <= 31; d++) cells.push({ d, outside: false });
  while (cells.length < 35) cells.push({ d: cells.length - 33, outside: true });
  return cells;
}

/** Derives calendar bands from live request state (declined requests drop off). */
function buildBands(requests: LeaveRequest[]): LeaveBand[] {
  const ranges: Record<string, { start: number; end: number }> = {
    l1: { start: 18, end: 20 },
    l2: { start: 26, end: 27 },
    l3: { start: 31, end: 31 },
    l4: { start: 5, end: 11 },
  };
  const bands: LeaveBand[] = [{ who: "Isabella Martin", start: 5, end: 11, state: "approved" }];
  for (const r of requests) {
    const range = ranges[r.id];
    if (!range || r.state === "declined") continue;
    bands.push({
      who: r.n,
      start: range.start,
      end: range.end,
      state: r.state === "approved" ? "approved" : "pending",
    });
  }
  return bands;
}

function shortName(who: string): string {
  const [first, last] = who.split(" ");
  return `${first} ${last?.[0] ?? ""}.`;
}

export function LeaveCalendarDrawer({ open, onOpenChange, onNewRequest, requests }: Props) {
  const cells = buildCells();
  const bands = buildBands(requests);

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Leave calendar"
      description="May 2025 · Approved & pending"
      width="xl"
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          {onNewRequest && (
            <ActionButton
              onClick={() => {
                onOpenChange(false);
                onNewRequest();
              }}
            >
              <Plus className="h-3 w-3" aria-hidden /> New request
            </ActionButton>
          )}
        </>
      }
    >
      <div className="row gap-2 mb-3">
        <StatusBadge tone="purple" dot>
          Approved
        </StatusBadge>
        <StatusBadge tone="warning" dot>
          Pending
        </StatusBadge>
        <StatusBadge tone="danger" dot>
          Coverage at risk
        </StatusBadge>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-[10px] border border-border/70">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-b border-border/70 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {day}
          </div>
        ))}
        {cells.map((cell, i) => {
          const isToday = !cell.outside && cell.d === TODAY;
          const matching = cell.outside
            ? []
            : bands.filter((b) => cell.d >= b.start && cell.d <= b.end);
          return (
            <div
              key={i}
              className={cn(
                "min-h-[70px] px-2 py-1.5",
                i < 28 && "border-b border-border/50",
                i % 7 !== 0 && "border-l border-border/50",
              )}
              style={isToday ? { background: "var(--st-teal-bg)" } : undefined}
            >
              <div
                className={cn("font-mono text-[11.5px]", isToday && "font-bold")}
                style={{
                  color: isToday
                    ? "var(--st-teal-ink)"
                    : cell.outside
                      ? "var(--ink-400)"
                      : "var(--ink-700)",
                }}
              >
                {cell.d}
              </div>
              <div className="mt-1 space-y-1">
                {matching.slice(0, 2).map((b, j) => (
                  <div
                    key={j}
                    className="overflow-hidden text-ellipsis whitespace-nowrap rounded px-1.5 text-[10.5px] font-semibold"
                    style={{
                      background: `var(--st-${b.state === "approved" ? "purple" : "amber"}-bg)`,
                      color: `var(--st-${b.state === "approved" ? "purple" : "amber"}-ink)`,
                      border: `1px solid var(--st-${b.state === "approved" ? "purple" : "amber"}-line)`,
                    }}
                    title={b.who}
                  >
                    {shortName(b.who)}
                  </div>
                ))}
                {matching.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+{matching.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </DrawerShell>
  );
}
