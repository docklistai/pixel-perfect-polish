import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  DialogShell,
  FormSection,
  FormRow,
} from "@/components/dl";
import { Users, CheckCircle2, UserPlus, AlertTriangle, Plus, Filter } from "lucide-react";
import { rows } from "@/features/staff/data/mockStaffData";
import { useWorkspaceStaff } from "@/features/staff/hooks/useWorkspaceStaff";
import { StaffProfilePanel } from "@/features/staff/components/StaffProfilePanel";
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
      sub: "Canonical demo team",
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
  const { rows: staffRows } = useWorkspaceStaff();
  const stats = buildStats(staffRows);
  const [addOpen, setAddOpen] = React.useState(false);

  useIntentHandler("staff.add", () => setAddOpen(true));
  const [invitePrepared, setInvitePrepared] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = staffRows.find((row) => row.id === selectedId) ?? staffRows[0] ?? rows[0];
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useStaffPanelState();
  const [query, setQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [attentionFilter, setAttentionFilter] = React.useState<StaffAttentionFilter>("all");

  React.useEffect(() => {
    if (!addOpen) setInvitePrepared(false);
  }, [addOpen]);

  function handleSendInvite() {
    setInvitePrepared(true);
  }

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
            <ActionButton icon={Plus} onClick={() => setAddOpen(true)}>
              Add team member
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
            selected={selected}
            query={query}
            onQueryChange={setQuery}
            deptFilter={deptFilter}
            onDeptChange={setDeptFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            attentionFilter={attentionFilter}
            onSelectMember={handleSelectMember}
            compact={isProfilePanelOpen}
          />
        </div>

        {isProfilePanelOpen && (
          <div className="col-span-12 lg:col-span-3 space-y-4 self-start lg:sticky lg:top-[88px]">
            <StaffProfilePanel member={selected} onClose={() => setIsProfilePanelOpen(false)} />
          </div>
        )}
      </div>

      <DialogShell
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add a team member"
        description="Send an invite to join Harbour View."
        icon={UserPlus}
        size="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleSendInvite}>Send invite</ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          {invitePrepared && (
            <div className="rounded-2xl border border-[var(--st-teal-line)] bg-[var(--st-teal-bg)] px-4 py-3 text-sm text-[var(--st-teal-ink)]">
              Invite prepared locally (demo). No backend send is wired.
            </div>
          )}
          <div className="rounded-2xl border border-border/40 bg-[var(--bg-raised)] px-4 py-3 text-sm text-muted-foreground">
            Keep this invite focused on scheduling access, role setup, and mobile portal access.
          </div>
          <FormSection title="Personal">
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="First name" htmlFor="add-first-name" required>
                <input
                  id="add-first-name"
                  aria-label="First name"
                  required
                  placeholder="Jamie"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </FormRow>
              <FormRow label="Last name" htmlFor="add-last-name" required>
                <input
                  id="add-last-name"
                  aria-label="Last name"
                  required
                  placeholder="Reid"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </FormRow>
            </div>
            <FormRow label="Work email" htmlFor="add-work-email" required>
              <input
                id="add-work-email"
                type="email"
                aria-label="Work email"
                required
                placeholder="name@harbourview.co.uk"
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </FormRow>
          </FormSection>
          <FormSection title="Role">
            <FormRow label="Department" htmlFor="add-department" required>
              <select
                id="add-department"
                aria-label="Department"
                required
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option>Front of House</option>
                <option>Bar</option>
                <option>Kitchen</option>
                <option>Housekeeping</option>
                <option>Maintenance</option>
              </select>
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Contract">
                <select
                  aria-label="Contract type"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Full-time (40h/week)</option>
                  <option>Part-time</option>
                  <option>Zero-hours</option>
                </select>
              </FormRow>
              <FormRow label="Hours / week">
                <input
                  aria-label="Hours per week"
                  placeholder="20"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
                />
              </FormRow>
            </div>
            <FormRow label="Pay rate">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">£</span>
                <input
                  aria-label="Pay rate"
                  placeholder="12.50"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">/ hr</span>
              </div>
            </FormRow>
          </FormSection>
          <label className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" defaultChecked className="rounded" />
            Send mobile portal access in the invite
          </label>
        </div>
      </DialogShell>
    </AppShell>
  );
}
