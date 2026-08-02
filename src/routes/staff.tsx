import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, Card, PageHeader, ActionButton } from "@/components/dl";
import {
  Users,
  CheckCircle2,
  UserPlus,
  KeyRound,
  CirclePause,
  UserRoundX,
  AlertTriangle,
  Loader2,
  ListPlus,
  Building2,
} from "lucide-react";
import { useWorkspaceStaff } from "@/features/staff/hooks/useWorkspaceStaff";
import { useWorkspaceDepartments } from "@/features/staff/hooks/useWorkspaceDepartments";
import { StaffProfilePanel } from "@/features/staff/components/StaffProfilePanel";
import { AccessCodesDialog } from "@/features/staff/components/AccessCodesDialog";
import { AddStaffDialog } from "@/features/staff/components/AddStaffDialog";
import { BulkAddStaffDialog } from "@/features/staff/components/BulkAddStaffDialog";
import { DepartmentsDialog } from "@/features/staff/components/DepartmentsDialog";
import { StaffTable } from "@/features/staff/components/StaffTable";
import { useStaffPanelState } from "@/features/staff/hooks/useStaffPanelState";
import type { StaffRow } from "@/features/staff/types";
import { buildStaffStats } from "@/features/staff/lib/staffListPresentation";
import { useIntentHandler } from "@/lib/interactionIntents";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/staff")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Staff — Docklist" }] }),
  component: StaffPage,
});

const statIcons = {
  total: Users,
  active: CheckCircle2,
  inactive: CirclePause,
  left: UserRoundX,
};

const toneBg = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  muted: "bg-muted text-muted-foreground",
};

function StaffPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <StaffListPage />;
}

function StaffListPage() {
  const { rows: staffRows, source, state } = useWorkspaceStaff();
  const stats = buildStaffStats(staffRows);
  const [addStaffOpen, setAddStaffOpen] = React.useState(false);
  const [bulkAddOpen, setBulkAddOpen] = React.useState(false);
  const [departmentsOpen, setDepartmentsOpen] = React.useState(false);
  const [accessCodesOpen, setAccessCodesOpen] = React.useState(false);
  // Departments back the optional Add Staff picker; only fetched once the dialog
  // is opened against a live roster.
  const { departments, isLoading: departmentsLoading } = useWorkspaceDepartments({
    enabled: source === "live" && addStaffOpen,
  });

  useIntentHandler("staff.add", () => setAddStaffOpen(true));
  useIntentHandler("staff.accessCodes", () => setAccessCodesOpen(true));
  useIntentHandler("staff.departments", () => setDepartmentsOpen(true));
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // No demo fallback: an empty live roster has no member to preview, so the
  // panel stays closed rather than surfacing seed data.
  const selectedMember = staffRows.find((row) => row.id === selectedId) ?? null;
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useStaffPanelState();
  const [query, setQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");

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
          // Four actions do not fit one row on a 320px screen. Wrapping keeps
          // Bulk add and Add staff on screen and reachable instead of pushing
          // them off the right edge and scrolling the whole document.
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <ActionButton
              variant="secondary"
              icon={Building2}
              onClick={() => setDepartmentsOpen(true)}
            >
              Departments
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={KeyRound}
              onClick={() => setAccessCodesOpen(true)}
            >
              Access codes
            </ActionButton>
            <ActionButton variant="secondary" icon={ListPlus} onClick={() => setBulkAddOpen(true)}>
              Bulk add
            </ActionButton>
            <ActionButton icon={UserPlus} onClick={() => setAddStaffOpen(true)}>
              Add staff
            </ActionButton>
          </div>
        }
      />

      {state === "ready" ? (
        <div className="grid grid-cols-12 gap-5">
          <div className={`col-span-12 ${isProfilePanelOpen ? "lg:col-span-9" : ""} space-y-5`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label} className="rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${toneBg[s.tone]}`}
                    >
                      {React.createElement(statIcons[s.key], {
                        className: "h-5 w-5",
                        "aria-hidden": true,
                      })}
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
              source={source}
              selected={selectedMember}
              query={query}
              onQueryChange={setQuery}
              deptFilter={deptFilter}
              onDeptChange={setDeptFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
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
      ) : (
        <Card className="rounded-2xl p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            {state === "loading" ? (
              <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
            ) : (
              <AlertTriangle className="size-6 text-warning" aria-hidden />
            )}
            <div>
              <h2 className="text-base font-semibold">
                {state === "loading" ? "Loading staff" : "Staff could not be loaded"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {state === "loading"
                  ? "Fetching your workspace roster."
                  : "Refresh the page to try loading your workspace roster again."}
              </p>
            </div>
          </div>
        </Card>
      )}

      <AddStaffDialog
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        source={source}
        departments={departments}
        departmentsLoading={departmentsLoading}
      />

      <BulkAddStaffDialog open={bulkAddOpen} onOpenChange={setBulkAddOpen} source={source} />

      <DepartmentsDialog open={departmentsOpen} onOpenChange={setDepartmentsOpen} source={source} />

      <AccessCodesDialog
        open={accessCodesOpen}
        onOpenChange={setAccessCodesOpen}
        staff={staffRows}
        source={source}
      />
    </AppShell>
  );
}
