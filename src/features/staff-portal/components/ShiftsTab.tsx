import * as React from "react";
import { CalendarOff, ChevronRight } from "lucide-react";
import { DashboardCard, EmptyState, StatusBadge } from "@/components/dl";
import { usePortalRota } from "../hooks/usePortalRota";
import { noUpcomingShiftsCopy } from "../lib/portalShiftCopy";
import type { PortalShift, ShiftStatus, ShiftsSubTab } from "../types";
import { OpenShiftsCard } from "./OpenShiftsCard";
import { ShiftDetailDrawer } from "./ShiftDetailDrawer";
import { ShiftRequestsList } from "./ShiftRequestsList";
import { PortalRotaReadState } from "./PortalRotaReadState";

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
  const rota = usePortalRota();
  const { upcoming, history, hasPublished, source } = rota;
  const [sub, setSub] = React.useState<ShiftsSubTab>("upcoming");
  const [selected, setSelected] = React.useState<PortalShift | null>(null);

  return (
    <div className="space-y-4">
      <SegmentedTabs value={sub} onChange={setSub} />

      {sub === "upcoming" && (
        <>
          <div className="px-1 text-[11px] text-muted-foreground">
            {source === "live" && !rota.isLoading && !rota.isError
              ? "Showing your live published rota."
              : source === "demo"
                ? "Showing sample shifts."
                : "Published rota status"}
          </div>
          {rota.isLoading || rota.isError ? (
            <PortalRotaReadState
              isLoading={rota.isLoading}
              isError={rota.isError}
              onRetry={rota.retry}
            />
          ) : (
            <>
              <ShiftList
                shifts={upcoming}
                hasPublishedSnapshot={hasPublished}
                emptyCopy={noUpcomingShiftsCopy(hasPublished)}
                onOpen={setSelected}
              />
              {source === "live" && <OpenShiftsCard />}
            </>
          )}
        </>
      )}
      {sub === "requests" && <ShiftRequestsList />}
      {sub === "history" &&
        (rota.isLoading || rota.isError ? (
          <PortalRotaReadState
            isLoading={rota.isLoading}
            isError={rota.isError}
            onRetry={rota.retry}
          />
        ) : (
          <ShiftList shifts={history} hasPublishedSnapshot={hasPublished} onOpen={setSelected} />
        ))}

      <ShiftDetailDrawer shift={selected} onClose={() => setSelected(null)} />
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
  emptyCopy,
  onOpen,
}: {
  shifts: PortalShift[];
  hasPublishedSnapshot?: boolean;
  /** Optional override for the empty state (e.g. the "no upcoming shifts" copy). */
  emptyCopy?: { title: string; description: string };
  onOpen: (s: PortalShift) => void;
}) {
  // Group by month label for visual section headers.
  const groups = groupByMonth(shifts);
  const dateCounts = countByDate(shifts);
  if (shifts.length === 0) {
    const title =
      emptyCopy?.title ??
      (hasPublishedSnapshot ? "No shifts on the published rota" : "No published rota yet");
    const description =
      emptyCopy?.description ??
      (hasPublishedSnapshot
        ? "You do not have any shifts in the current published rota."
        : "Once your manager publishes the rota, your shifts will appear here.");
    return (
      <DashboardCard className="p-6">
        <EmptyState icon={CalendarOff} title={title} description={description} />
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
                        {(dateCounts.get(s.date) ?? 0) > 1 && (
                          <div className="mt-1 text-[11px] font-medium text-warning">
                            Multiple shifts this day
                          </div>
                        )}
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

function countByDate(shifts: PortalShift[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const shift of shifts) counts.set(shift.date, (counts.get(shift.date) ?? 0) + 1);
  return counts;
}

function groupByMonth(shifts: PortalShift[]): { label: string; shifts: PortalShift[] }[] {
  const map = new Map<string, PortalShift[]>();
  for (const s of shifts) {
    const d = new Date(`${s.date}T12:00:00Z`);
    const label = d.toLocaleDateString("en-GB", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
    const existing = map.get(label) ?? [];
    existing.push(s);
    map.set(label, existing);
  }
  return Array.from(map.entries()).map(([label, shifts]) => ({ label, shifts }));
}
