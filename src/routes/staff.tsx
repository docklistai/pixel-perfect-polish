import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
  FilterButton,
  DrawerShell,
  FormSection,
  FormRow,
} from "@/components/dl";
import {
  Users,
  CheckCircle2,
  UserPlus,
  AlertTriangle,
  Filter,
  Plus,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { rows } from "@/features/staff/data/mockStaffData";
import { StaffProfilePanel } from "@/features/staff/components/StaffProfilePanel";
import { StaffTable } from "@/features/staff/components/StaffTable";
import { useStaffPanelState } from "@/features/staff/hooks/useStaffPanelState";
import type { StaffRow } from "@/features/staff/types";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — Docklist" }] }),
  component: StaffPage,
});

function buildStats(staffRows: typeof rows) {
  const total = staffRows.length;
  const active = staffRows.filter((r) => r.status === "Active").length;
  const onboarding = staffRows.filter((r) => r.status === "Probation").length;
  return [
    {
      icon: Users,
      label: "TOTAL STAFF",
      value: String(total),
      sub: "Across all departments",
      action: "View all staff",
      tone: "info",
    },
    {
      icon: CheckCircle2,
      label: "ACTIVE THIS WEEK",
      value: String(active),
      sub: `${Math.round((active / total) * 100)}% of total staff`,
      action: "View rota",
      tone: "brand",
    },
    {
      icon: UserPlus,
      label: "ONBOARDING",
      value: String(onboarding),
      sub: "Currently on probation",
      action: "View onboarding",
      tone: "warning",
    },
    {
      icon: AlertTriangle,
      label: "MISSING DOCUMENTS",
      value: "—",
      sub: "Not yet wired",
      action: "View alerts",
      tone: "info",
    },
  ];
}

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
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
  const stats = buildStats(rows);
  const [addOpen, setAddOpen] = React.useState(false);
  const [inviteSent, setInviteSent] = React.useState(false);
  const [selected, setSelected] = React.useState<StaffRow>(rows[0]);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useStaffPanelState();
  const [query, setQuery] = React.useState("");

  function handleSendInvite() {
    setInviteSent(true);
    setTimeout(() => {
      setAddOpen(false);
      setInviteSent(false);
    }, 1400);
  }

  function handleSelectMember(row: StaffRow) {
    setSelected(row);
    setIsProfilePanelOpen(true);
  }

  return (
    <AppShell searchPlaceholder="Search staff, roles, skills...">
      <PageHeader
        title="Staff"
        subtitle="Manage your team, roles, and access in one place."
        actions={
          <>
            <FilterButton
              icon={Filter}
              label="Filters"
              showCaret={false}
              className="opacity-50 pointer-events-none"
            />
            <ActionButton icon={Plus} iconRight={ChevronDown} onClick={() => setAddOpen(true)}>
              Add team member
            </ActionButton>
            <IconButton
              icon={MoreHorizontal}
              label="More actions"
              disabled
              className="opacity-50 cursor-not-allowed"
            />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className={`col-span-12 ${isProfilePanelOpen ? "lg:col-span-9" : ""} space-y-5`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[s.tone]}`}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    {s.label}
                  </div>
                </div>
                <div className="mt-3 text-3xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                <button
                  type="button"
                  className={`mt-3 w-full rounded-lg border py-1.5 text-xs font-medium ${s.tone === "danger" || s.tone === "warning" ? `border-${s.tone} text-${s.tone}` : "border-border text-foreground"}`}
                  style={
                    s.tone === "danger"
                      ? { borderColor: "var(--danger)", color: "var(--danger)" }
                      : s.tone === "warning"
                        ? { borderColor: "var(--warning)", color: "var(--warning)" }
                        : undefined
                  }
                >
                  {s.action}
                </button>
              </Card>
            ))}
          </div>

          <StaffTable
            rows={rows}
            selected={selected}
            query={query}
            onQueryChange={setQuery}
            onSelectMember={handleSelectMember}
          />
        </div>

        {isProfilePanelOpen && (
          <StaffProfilePanel member={selected} onClose={() => setIsProfilePanelOpen(false)} />
        )}
      </div>

      <DrawerShell
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add team member"
        description="Invite a new colleague to Harbour View Hotel."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleSendInvite}>Send invite</ActionButton>
          </>
        }
      >
        {inviteSent ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="text-2xl font-bold text-success">Invite ready to send</div>
            <p className="text-sm text-muted-foreground">
              The invite will be sent once wired to the backend.
            </p>
          </div>
        ) : (
          <>
            <FormSection title="Personal">
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="First name" required>
                  <input
                    aria-label="First name"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </FormRow>
                <FormRow label="Last name" required>
                  <input
                    aria-label="Last name"
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </FormRow>
              </div>
              <FormRow label="Work email" required>
                <input
                  type="email"
                  aria-label="Work email"
                  placeholder="name@docklist.co.uk"
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
              </FormRow>
            </FormSection>
            <FormSection title="Role">
              <FormRow label="Department" required>
                <select
                  aria-label="Department"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Front of House</option>
                  <option>Bar</option>
                  <option>Kitchen</option>
                  <option>Housekeeping</option>
                  <option>Events</option>
                  <option>Maintenance</option>
                </select>
              </FormRow>
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
            </FormSection>
          </>
        )}
      </DrawerShell>
    </AppShell>
  );
}
