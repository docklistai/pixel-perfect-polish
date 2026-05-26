import { ActionButton, DrawerShell, StatusBadge } from "@/components/dl";
import { cal, CAL_DAYS, CAL_DATES } from "../data/leaveDemoData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function legendItem(label: string, tone: "teal" | "amber" | "red") {
  return (
    <span className="row gap-2">
      <span
        className="h-3 w-6 rounded"
        style={{
          background:
            tone === "teal"
              ? "var(--st-green-bg)"
              : tone === "amber"
                ? "var(--st-amber-bg)"
                : "repeating-linear-gradient(45deg, #DDE3EE 0 4px, #F2F4F9 4px 8px)",
          border: `1px solid ${tone === "teal" ? "var(--st-green-line)" : tone === "amber" ? "var(--st-amber-line)" : "var(--border)"}`,
        }}
      />
      {label}
    </span>
  );
}

export function LeaveCalendarDrawer({ open, onOpenChange }: Props) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Leave calendar"
      description="May 2026 · Approved, pending and unavailable coverage"
      width="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
        </>
      }
    >
      <div className="row gap-2 mb-4">
        <StatusBadge tone="success">Approved</StatusBadge>
        <StatusBadge tone="warning">Pending</StatusBadge>
        <StatusBadge tone="danger">Coverage at risk</StatusBadge>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[180px_repeat(14,minmax(0,1fr))] border-b border-border pb-2">
            <div className="section-label">Staff member</div>
            {CAL_DAYS.map((day, index) => (
              <div key={day + CAL_DATES[index]} className="text-center text-[10px] text-muted">
                <div className="strong">{day}</div>
                <div>{CAL_DATES[index]}</div>
              </div>
            ))}
          </div>

          {cal.map((entry) => {
            const isAnnual = entry.type === "annual";
            const isPending = entry.type === "pending";
            const bg = isAnnual
              ? "var(--st-green-bg)"
              : isPending
                ? "var(--st-amber-bg)"
                : "repeating-linear-gradient(45deg, #DDE3EE 0 4px, #F2F4F9 4px 8px)";
            const border = isAnnual
              ? "var(--st-green-line)"
              : isPending
                ? "var(--st-amber-line)"
                : "var(--border)";
            const color = isAnnual ? "var(--st-green-ink)" : "var(--st-amber-ink)";

            return (
              <div
                key={entry.n}
                className="grid grid-cols-[180px_repeat(14,minmax(0,1fr))] items-center border-b border-border/60 py-2.5"
              >
                <div className="row gap-2 pr-2">
                  <div className="av av-c3 sm">
                    {entry.n
                      .split(" ")
                      .map((part) => part[0] ?? "")
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="strong txt-md truncate">{entry.n}</div>
                    <div className="muted txt-xs truncate">{entry.dept}</div>
                  </div>
                </div>
                <div className="col-span-14 relative h-7">
                  <div
                    className="absolute top-1/2 h-6 -translate-y-1/2 rounded-md px-2 text-[10px] flex items-center"
                    style={{
                      left: `${(entry.range[0] / 14) * 100}%`,
                      width: `${((entry.range[1] - entry.range[0] + 1) / 14) * 100}%`,
                      background: bg,
                      border: `1px solid ${border}`,
                      color,
                    }}
                  >
                    {isAnnual ? "Approved leave" : isPending ? "Pending request" : "Unavailable"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted">
        {legendItem("Approved leave", "teal")}
        {legendItem("Unavailable", "red")}
        {legendItem("Pending request", "amber")}
      </div>
    </DrawerShell>
  );
}
