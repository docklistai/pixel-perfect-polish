import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, Card, PageHeader, ActionButton } from "@/components/dl";
import { Users, CheckCircle2, UserPlus, AlertTriangle, KeyRound, Filter } from "lucide-react";
import { useWorkspaceStaff } from "@/features/staff/hooks/useWorkspaceStaff";
import { useWorkspaceDepartments } from "@/features/staff/hooks/useWorkspaceDepartments";
import { StaffProfilePanel } from "@/features/staff/components/StaffProfilePanel";
import { AccessCodesDialog } from "@/features/staff/components/AccessCodesDialog";
import { AddStaffDialog } from "@/features/staff/components/AddStaffDialog";
import { StaffTable } from "@/features/staff/components/StaffTable";
import type { StaffAttentionFilter } from "@/features/staff/components/StaffTable";
import { useStaffPanelState } from "@/features/staff/hooks/useStaffPanelState";
import type { StaffRow } from "@/features/staff/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIntentHandler } from "@/lib/interactionIntents";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/staff")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Staff — Docklist" }] }),
  component: StaffPage,
});

type StatTone = "info" | "brand" | "warning" | "muted" | "danger";

type StatCard = {
  icon: typeof Users;
  label: string;
  value: string;
  sub: string;
  tone: StatTone;
};

function buildStats(staffRows: StaffRow[]): StatCard[] {
  const total = staffRows.length;
  const active = staffRows.filter((r) => r.status === "Active").length;
  const onboarding = staffRows.filter((r) => r.status === "Probation").length;
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  return [
    {
      icon: Users,
      label: "Total staff",
      value: String(total),
      sub: "Across your team",
      tone: "info",
    },
    {
      icon: CheckCircle2,
      label: "Active this week",
      value: String(active),
      sub: `${activePct}% of total`,
      tone: "brand",
    },
    {
      icon: UserPlus,
      label: "Onboarding",
      value: String(onboarding),
      sub: "Currently on probation",
      tone: "warning",
    },
    {
      icon: AlertTriangle,
      label: "Missing documents",
      value: "1",
      sub: "One record needs attention",
      tone: "danger",
    },
  ];
}

const toneBg: Record<StatTone, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-danger-soft text-danger",
};

function StaffPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <StaffListPage />;
}

function StaffListPage() {
  const { rows: staffRows, source } = useWorkspaceStaff();
  const stats = buildStats(staffRows);
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [accessCodesOpen, setAccessCodesOpen] = React.useState(false);
  // Departments back the optional Add Staff picker; only fetched once the dialog
  // is opened against a live roster.
  const { departments } = useWorkspaceDepartments({ enabled: source === "live" && addStaffOpen });

  useIntentHandler("staff.add", () => setAddStaffOpen(true));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // No demo fallback: an empty live roster has no member to preview, so the
  // panel stays closed rather than surfacing seed data.
  const selectedMember = staffRows.find((row) => row.id === selectedId) ?? null;
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useStaffPanelState();
  const [query, setQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [attentionFilter, setAttentionFilter] = React.useState<StaffAttentionFilter>("all");

  function handleSelectMember(row: StaffRow) {
    setSelectedId(row.id);
    setIsProfilePanelOpen(true);
  }

  return (
    <AppShell searchPlaceholder="Search staff, roles, skills...">
      <PageHeader
        title="Staff"
        subtitle="Manage your team, roles, and access in one place."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton variant="secondary" icon={Filter}>
                  Filters
                </ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setStatusFilter("Probation")}>
                  Onboarding only
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAttentionFilter("missing-documents")}>
                  Missing documents
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAttentionFilter("outside-availability")}>
                  Outside availability
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setDeptFilter("All");
                    setStatusFilter("All");
                    setAttentionFilter("all");
                    setQuery("");
                  }}
                >
                  Clear all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ActionButton
              variant="secondary"
              icon={KeyRound}
              onClick={() => setAccessCodesOpen(true)}
            >
              Access codes
            </ActionButton>
            <ActionButton icon={UserPlus} onClick={() => setAddStaffOpen(true)}>
              Add staff
            </ActionButton>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className={`col-span-12 ${isProfilePanelOpen ? "lg:col-span-9" : ""} space-y-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${toneBg[s.tone]}`}
                  >
                    <s.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground leading-tight">
                    {s.label}
                  </div>
                </div>
                <div className="text-3xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
              </Card>
            ))}
          </div>

          <StaffTable
            rows={staffRows}
            selected={selectedMember}
            query={query}
            onQueryChange={setQuery}
            deptFilter={deptFilter}
            onDeptChange={setDeptFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            attentionFilter={attentionFilter}
            onSelectMember={handleSelectMember}
            onAddStaff={() => setAddStaffOpen(true)}
            compact={isProfilePanelOpen}
          />
        </div>

        {isProfilePanelOpen && selectedMember && (
          <div className="col-span-12 lg:col-span-3 space-y-4 self-start lg:sticky lg:top-[88px]">
            <StaffProfilePanel
              member={selectedMember}
              source={source}
              onClose={() => setIsProfilePanelOpen(false)}
            />
          </div>
        )}
      </div>

      <AddStaffDialog
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        source={source}
        departments={departments}
      />

      <AccessCodesDialog
        open={accessCodesOpen}
        onOpenChange={setAccessCodesOpen}
        staff={staffRows}
        source={source}
      />
    </AppShell>
  );
}
