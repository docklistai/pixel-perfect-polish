import { createFileRoute } from "@tanstack/react-router";
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

const stats = [
  {
    icon: Users,
    label: "TOTAL STAFF",
    value: "48",
    sub: "↑ 4 vs last month",
    action: "View all staff",
    tone: "info",
  },
  {
    icon: CheckCircle2,
    label: "ACTIVE THIS WEEK",
    value: "42",
    sub: "87% of total staff",
    action: "View rota",
    tone: "brand",
  },
  {
    icon: UserPlus,
    label: "ONBOARDING",
    value: "3",
    sub: "2 start this week",
    action: "View onboarding",
    tone: "warning",
  },
  {
    icon: AlertTriangle,
    label: "MISSING DOCUMENTS",
    value: "6",
    sub: "Requires attention",
    action: "View alerts",
    tone: "danger",
  },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function StaffPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<StaffRow>(rows[0]);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useStaffPanelState();
  const [query, setQuery] = React.useState("");

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
            <FilterButton icon={Filter} label="Filters" showCaret={false} />
            <ActionButton icon={Plus} iconRight={ChevronDown} onClick={() => setAddOpen(true)}>
              Add team member
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
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
            <ActionButton onClick={() => setAddOpen(false)}>Send invite</ActionButton>
          </>
        }
      >
        <FormSection title="Personal">
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="First name" required>
              <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            </FormRow>
            <FormRow label="Last name" required>
              <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
            </FormRow>
          </div>
          <FormRow label="Work email" required>
            <input
              type="email"
              placeholder="name@docklist.co.uk"
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </FormRow>
        </FormSection>
        <FormSection title="Role">
          <FormRow label="Department" required>
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option>Front of House</option>
              <option>Bar</option>
              <option>Kitchen</option>
              <option>Housekeeping</option>
            </select>
          </FormRow>
          <FormRow label="Contract">
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option>Full-time (40h/week)</option>
              <option>Part-time</option>
              <option>Zero-hours</option>
            </select>
          </FormRow>
        </FormSection>
      </DrawerShell>
    </AppShell>
  );
}
