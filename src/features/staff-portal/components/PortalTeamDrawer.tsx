import { Users } from "lucide-react";
import { DashboardCard, DrawerShell, EmptyState, StatusBadge } from "@/components/dl";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import { teamOnDutyToday } from "../lib/portalRota";
import { usePortalTeamShifts } from "../hooks/usePortalTeamShifts";
import type { PortalTeamShift } from "../api/portalTeamData";

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "—";
}

function TeamShiftRow({ shift, isSelf }: { shift: PortalTeamShift; isSelf: boolean }) {
  const name = shift.isOpen ? "Open shift" : (shift.name ?? "Colleague");
  return (
    <li className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
          isSelf ? "bg-brand text-white" : "bg-muted text-muted-foreground"
        }`}
        aria-hidden
      >
        {shift.isOpen ? "?" : initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {isSelf ? "You" : name}
          {shift.isOpen && (
            <StatusBadge tone="info" className="ml-2">
              Needs cover
            </StatusBadge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">{shift.role}</div>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {shift.start} – {shift.end}
      </span>
    </li>
  );
}

function groupByDay(shifts: PortalTeamShift[]): { label: string; shifts: PortalTeamShift[] }[] {
  const groups = new Map<string, { label: string; shifts: PortalTeamShift[] }>();
  for (const shift of shifts) {
    const group = groups.get(shift.date) ?? { label: shift.dayLabel, shifts: [] };
    group.shifts.push(shift);
    groups.set(shift.date, group);
  }
  return Array.from(groups.values());
}

/**
 * Who's working this week, from the latest published snapshot — the digital
 * version of the rota on the staff-room wall. Demo sessions show today's
 * sample colleagues from the demo store.
 */
export function PortalTeamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const team = usePortalTeamShifts();
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);

  const demoTeam = !team.enabled ? teamOnDutyToday(weekDrafts, "olivia-bennett") : [];

  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Who's working"
      description="Published shifts for your team this week"
      width="lg"
    >
      <div className="space-y-4">
        {team.enabled ? (
          team.isLoading ? (
            <DashboardCard className="p-4 text-sm text-muted-foreground">
              Loading the published rota…
            </DashboardCard>
          ) : team.isError ? (
            <DashboardCard className="p-4">
              <div className="text-sm font-semibold">Couldn&apos;t load the team rota</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Refresh to try again. Your own shifts are unaffected.
              </p>
            </DashboardCard>
          ) : team.shifts.length === 0 ? (
            <DashboardCard className="p-6">
              <EmptyState
                icon={Users}
                title="No published shifts this week"
                description="Once your manager publishes the rota, everyone's shifts appear here."
              />
            </DashboardCard>
          ) : (
            groupByDay(team.shifts).map((group) => (
              <DashboardCard key={group.label} className="p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </div>
                <ul>
                  {group.shifts.map((shift) => (
                    <TeamShiftRow
                      key={shift.id}
                      shift={shift}
                      isSelf={
                        shift.staffMemberId !== null &&
                        shift.staffMemberId === team.selfStaffMemberId
                      }
                    />
                  ))}
                </ul>
              </DashboardCard>
            ))
          )
        ) : demoTeam.length > 0 ? (
          <DashboardCard className="p-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Today · sample rota
            </div>
            <ul>
              {demoTeam.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {member.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{member.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{member.role}</div>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {member.shiftLabel}
                  </span>
                </li>
              ))}
            </ul>
          </DashboardCard>
        ) : (
          <DashboardCard className="p-6">
            <EmptyState
              icon={Users}
              title="No published shifts today"
              description="Colleagues on the published rota appear here."
            />
          </DashboardCard>
        )}
      </div>
    </DrawerShell>
  );
}
