import * as React from "react";
import { CalendarOff, ChevronRight } from "lucide-react";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/dl";
import { usePortalRota } from "../hooks/usePortalRota";
import type { PortalRequest, PortalShift, ShiftStatus, ShiftsSubTab } from "../types";
import { ShiftDetailDrawer } from "./ShiftDetailDrawer";

const statusTone: Record<ShiftStatus, "success" | "warning" | "info"> = {
  confirmed: "success",
  open: "info",
  changed: "warning",
};

const statusLabel: Record<ShiftStatus, string> = {
  confirmed: "Scheduled",
  open: "Open shift",
  changed: "Changed",
};

const SUB_TABS: { id: ShiftsSubTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "requests", label: "My requests" },
  { id: "history", label: "History" },
];

export function ShiftsTab() {
  const { upcoming, hasPublished, source, isError } = usePortalRota();
  const [sub, setSub] = React.useState<ShiftsSubTab>("upcoming");
  const [selected, setSelected] = React.useState<PortalShift | null>(null);
  const [acknowledgedShiftIds, setAcknowledgedShiftIds] = React.useState<Set<string>>(new Set());

  const acknowledgeShift = (shiftId: string) => {
    setAcknowledgedShiftIds((current) => new Set([...current, shiftId]));
  };

  return (
    <div className="space-y-4">
      <SegmentedTabs value={sub} onChange={setSub} />

      {sub === "upcoming" && (
        <>
          <div className="px-1 text-[11px] text-muted-foreground">
            {source === "live"
              ? "Showing your live published rota."
              : isError
                ? "Couldn't reach live data — showing sample shifts."
                : "Showing sample shifts."}
          </div>
          <ShiftList shifts={upcoming} hasPublishedSnapshot={hasPublished} onOpen={setSelected} />
        </>
      )}
      {sub === "requests" && <RequestsList />}
      {sub === "history" && <ShiftList shifts={[]} onOpen={setSelected} />}

      <ShiftDetailDrawer
        shift={selected}
        acknowledged={selected ? acknowledgedShiftIds.has(selected.id) : false}
        onAcknowledge={acknowledgeShift}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function SegmentedTabs({
  value,
  onChange,
}: {
  value: ShiftsSubTab;
  onChange: (v: ShiftsSubTab) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-2xl bg-muted/80 p-1.5 text-sm font-medium shadow-[var(--shadow-card)]">
      {SUB_TABS.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={
              active
                ? "rounded-xl bg-card text-foreground py-2.5 shadow-[var(--shadow-card)]"
                : "rounded-xl text-muted-foreground py-2.5 hover:text-foreground"
            }
            aria-pressed={active}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ShiftList({
  shifts,
  hasPublishedSnapshot = true,
  onOpen,
}: {
  shifts: PortalShift[];
  hasPublishedSnapshot?: boolean;
  onOpen: (s: PortalShift) => void;
}) {
  // Group by month label for visual section headers.
  const groups = groupByMonth(shifts);
  if (shifts.length === 0) {
    return (
      <DashboardCard className="p-6">
        <EmptyState
          icon={CalendarOff}
          title={hasPublishedSnapshot ? "No shifts on the published rota" : "No published rota yet"}
          description={
            hasPublishedSnapshot
              ? "You do not have any shifts in the current published rota."
              : "Once your manager publishes the rota, your shifts will appear here."
          }
        />
      </DashboardCard>
    );
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground px-1 mb-2 uppercase">
            {g.label}
          </div>
          <ul className="space-y-2">
            {g.shifts.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onOpen(s)} className="w-full text-left">
                  <DashboardCard className="p-4 hover:bg-muted/30 transition-colors rounded-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                          {s.dayLabel.toUpperCase()}
                        </div>
                        <div className="mt-1 text-base font-semibold">
                          {s.start} – {s.end}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {s.role} · {s.station}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge tone={statusTone[s.status]}>
                          {statusLabel[s.status]}
                        </StatusBadge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </DashboardCard>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RequestsList() {
  const requests: PortalRequest[] = [];
  if (requests.length === 0) {
    return (
      <DashboardCard className="p-6">
        <EmptyState
          icon={CalendarOff}
          title="No requests yet"
          description="Submitted requests will appear here."
        />
      </DashboardCard>
    );
  }
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id}>
          <DashboardCard className="p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.submitted}</div>
                {r.managerResponse && (
                  <div className="text-xs text-foreground mt-1.5">
                    <span className="font-medium">Manager response:</span> {r.managerResponse}
                  </div>
                )}
              </div>
              <StatusBadge
                tone={
                  r.status === "approved"
                    ? "success"
                    : r.status === "declined"
                      ? "danger"
                      : "warning"
                }
              >
                {r.status[0].toUpperCase() + r.status.slice(1)}
              </StatusBadge>
            </div>
          </DashboardCard>
        </li>
      ))}
    </ul>
  );
}

function groupByMonth(shifts: PortalShift[]): { label: string; shifts: PortalShift[] }[] {
  const map = new Map<string, PortalShift[]>();
  for (const s of shifts) {
    const d = new Date(s.date);
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const existing = map.get(label) ?? [];
    existing.push(s);
    map.set(label, existing);
  }
  return Array.from(map.entries()).map(([label, shifts]) => ({ label, shifts }));
}
