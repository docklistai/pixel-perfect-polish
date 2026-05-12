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
  DetailRow,
  StatusBadge,
  EmptyState,
} from "@/components/dl";
import {
  Users,
  CheckCircle2,
  UserPlus,
  AlertTriangle,
  Filter,
  Plus,
  ChevronDown,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  X,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from "lucide-react";

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

const rows = [
  {
    n: "Sophie Carter",
    e: "sophie.carter@docklist.co.uk",
    role: "Front of House",
    sub: "Supervisor",
    dept: "Front of House",
    status: "Active",
    contract: "Full-time",
    avail: "85%",
    availTone: "high",
    img: 5,
    active: true,
  },
  {
    n: "Daniel Mitchell",
    e: "daniel.mitchell@docklist.co.uk",
    role: "Chef",
    sub: "Senior Chef",
    dept: "Kitchen",
    status: "Active",
    contract: "Full-time",
    avail: "90%",
    availTone: "high",
    img: 12,
  },
  {
    n: "Priya Patel",
    e: "priya.patel@docklist.co.uk",
    role: "Housekeeping",
    sub: "Housekeeping Attendant",
    dept: "Housekeeping",
    status: "Active",
    contract: "Part-time",
    avail: "60%",
    availTone: "med",
    img: 47,
  },
  {
    n: "Liam O'Connor",
    e: "liam.oconnor@docklist.co.uk",
    role: "Bartender",
    sub: "",
    dept: "Bar",
    status: "Active",
    contract: "Part-time",
    avail: "75%",
    availTone: "high",
    img: 13,
  },
  {
    n: "Olivia Bennett",
    e: "olivia.bennett@docklist.co.uk",
    role: "Events Coordinator",
    sub: "",
    dept: "Events",
    status: "Active",
    contract: "Full-time",
    avail: "80%",
    availTone: "high",
    img: 16,
  },
  {
    n: "Emma Johnson",
    e: "emma.johnson@docklist.co.uk",
    role: "Front of House",
    sub: "Team Member",
    dept: "Front of House",
    status: "Active",
    contract: "Part-time",
    avail: "65%",
    availTone: "med",
    img: 9,
  },
  {
    n: "Noah Williams",
    e: "noah.williams@docklist.co.uk",
    role: "Chef",
    sub: "Demi Chef",
    dept: "Kitchen",
    status: "Probation",
    contract: "Full-time",
    avail: "70%",
    availTone: "high",
    img: 33,
    statusTone: "info",
  },
  {
    n: "Ava Thompson",
    e: "ava.thompson@docklist.co.uk",
    role: "Housekeeping",
    sub: "Supervisor",
    dept: "Housekeeping",
    status: "Active",
    contract: "Full-time",
    avail: "95%",
    availTone: "high",
    img: 23,
  },
  {
    n: "James Lewis",
    e: "james.lewis@docklist.co.uk",
    role: "Maintenance",
    sub: "Technician",
    dept: "Maintenance",
    status: "Active",
    contract: "Full-time",
    avail: "50%",
    availTone: "med",
    img: 14,
  },
  {
    n: "Isabella Martin",
    e: "isabella.martin@docklist.co.uk",
    role: "Front of House",
    sub: "Team Member",
    dept: "Front of House",
    status: "On Leave",
    contract: "Part-time",
    avail: "—",
    availTone: "off",
    img: 25,
    statusTone: "purple",
  },
];

type Row = (typeof rows)[number];

function StaffPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<null | { n: string; e: string; role: string }>(null);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Row>(rows[0]);
  const filteredRows = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.n.toLowerCase().includes(q) ||
      r.e.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.dept.toLowerCase().includes(q)
    );
  });

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
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

          <Card className="rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-3 pb-3">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 flex-1 max-w-xs">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none w-full"
                  placeholder="Search by name, email or role..."
                />
              </div>
              <button className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                All departments <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                All roles <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                Employment status <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" /> More filters
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground border-y border-border">
                  <th className="text-left py-2.5 px-2">STAFF MEMBER</th>
                  <th className="text-left py-2.5">ROLE</th>
                  <th className="text-left py-2.5">DEPARTMENT</th>
                  <th className="text-left py-2.5">STATUS</th>
                  <th className="text-left py-2.5">CONTRACT</th>
                  <th className="text-left py-2.5">AVAILABILITY</th>
                  <th className="text-left py-2.5">PORTAL</th>
                  <th className="text-left py-2.5">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr
                    key={r.n}
                    onClick={() => {
                      setSelected(r);
                      setProfile({ n: r.n, e: r.e, role: r.role });
                    }}
                    className={`border-b border-border/60 last:border-0 cursor-pointer hover:bg-muted/40 ${selected.n === r.n ? "bg-info-soft/30" : ""}`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://i.pravatar.cc/64?img=${r.img}`}
                          className="h-8 w-8 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <div className="font-medium">{r.n}</div>
                          <div className="text-[11px] text-muted-foreground">{r.e}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{r.role}</div>
                      {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
                    </td>
                    <td className="py-3 text-muted-foreground">{r.dept}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 ${r.statusTone === "info" ? "text-info" : r.statusTone === "purple" ? "text-accent-purple" : "text-success"}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{r.contract}</td>
                    <td className="py-3">
                      <span className="font-medium">{r.avail}</span>{" "}
                      <span
                        className={`ml-1 text-[11px] ${r.availTone === "high" ? "text-success" : r.availTone === "med" ? "text-warning" : "text-muted-foreground"}`}
                      >
                        {r.availTone === "high" ? "High" : r.availTone === "med" ? "Medium" : ""}
                      </span>
                    </td>
                    <td className="py-3">
                      {r.availTone === "off" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-brand" />
                      )}
                    </td>
                    <td className="py-3">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 && (
              <EmptyState
                title="No staff found"
                description="Try adjusting your search or filters."
              />
            )}

            <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
              <span>Showing 1 to 10 of 48 results</span>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 rounded-md border border-border flex items-center justify-center">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {["1", "2", "3", "…", "5"].map((p) => (
                  <button
                    key={p}
                    className={`h-7 w-7 rounded-md text-xs ${p === "1" ? "bg-primary text-primary-foreground" : "border border-border"}`}
                  >
                    {p}
                  </button>
                ))}
                <button className="h-7 w-7 rounded-md border border-border flex items-center justify-center">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button className="rounded-md border border-border px-2 py-1 flex items-center gap-1">
                10 per page <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </Card>
        </div>

        {/* Profile drawer */}
        <Card className="col-span-12 lg:col-span-3 rounded-2xl p-5 self-start">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">{selected.n}</div>
            <X className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3">
            <img
              src={`https://i.pravatar.cc/96?img=${selected.img}`}
              className="h-16 w-16 rounded-full object-cover"
              alt=""
            />
            <div>
              <div className="font-semibold">{selected.n}</div>
              <div className="text-xs text-muted-foreground">
                {selected.role}
                {selected.sub ? ` · ${selected.sub}` : ""}
              </div>
              <span className="mt-1 inline-block rounded-md bg-success-soft text-success px-2 py-0.5 text-[11px] font-medium">
                {selected.status}
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs space-y-1">
            <div className="text-foreground">{selected.e}</div>
            <div className="text-muted-foreground">Department: {selected.dept}</div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {[MessageCircle, Phone, Mail, Calendar, MoreHorizontal].map((I, i) => (
              <button
                key={i}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center"
              >
                <I className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-5 border-b border-border flex gap-4 text-xs">
            {["Overview", "Documents", "Availability", "Notes"].map((t, i) => (
              <button
                key={t}
                className={`pb-2 ${i === 0 ? "border-b-2 border-brand text-brand font-semibold" : "text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <dl className="mt-4 text-xs space-y-2">
            {[
              ["Employee ID", "DCL-1027"],
              ["Start date", "14 Mar 2023 (2y 2m)"],
              ["Department", "Front of House"],
              ["Reports to", "Alex Thompson"],
              ["Contract", "Full-time (40h/week)"],
              ["Pay rate", "£13.50 per hour"],
              ["Location", "Harbour View Hotel"],
              ["Address", "12 Harbour Rd, Brighton, BN1 1AA"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</dt>
                <dd className="font-medium text-right">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <div className="text-xs font-semibold mb-2">Skills & Certifications</div>
            <div className="flex flex-wrap gap-1.5">
              {["Customer Service", "Supervisor", "Food Safety Level 2", "Beverage Knowledge"].map(
                (t) => (
                  <span key={t} className="rounded-md border border-border px-2 py-0.5 text-[11px]">
                    {t}
                  </span>
                ),
              )}
              <span className="text-[11px] text-brand font-medium">+ 3 more</span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border p-3">
            <div className="text-xs font-semibold mb-2">NEXT SCHEDULED SHIFT</div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-brand" /> Today, 12 May{" "}
              <span className="ml-auto font-semibold">14:00 – 22:00</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Front of House</span>
              <span>Evening Shift</span>
            </div>
            <button type="button" className="mt-2 block text-xs font-semibold text-brand">
              View full rota
            </button>
          </div>
        </Card>
      </div>

      {/* Add team member drawer */}
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

      {/* Staff profile drawer (mirrors right-side profile style) */}
      <DrawerShell
        open={!!profile}
        onOpenChange={(o) => !o && setProfile(null)}
        width="lg"
        title={profile?.n ?? ""}
        description={profile?.role}
        meta={<StatusBadge tone="success">Active</StatusBadge>}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setProfile(null)}>
              Close
            </ActionButton>
            <ActionButton onClick={() => setProfile(null)}>Open full profile</ActionButton>
          </>
        }
      >
        <FormSection title="Contact">
          <dl className="divide-y divide-border">
            <DetailRow label="Email" value={profile?.e ?? "—"} />
            <DetailRow label="Phone" value="+44 7700 900123" />
            <DetailRow label="Location" value="Harbour View Hotel" />
          </dl>
        </FormSection>
        <FormSection title="Employment">
          <dl className="divide-y divide-border">
            <DetailRow label="Employee ID" value="DCL-1027" />
            <DetailRow label="Start date" value="14 Mar 2023" />
            <DetailRow label="Contract" value="Full-time (40h/week)" />
            <DetailRow label="Pay rate" value="£13.50 per hour" />
          </dl>
        </FormSection>
        <FormSection title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {["Customer Service", "Supervisor", "Food Safety Level 2"].map((t) => (
              <span key={t} className="rounded-md border border-border px-2 py-0.5 text-[11px]">
                {t}
              </span>
            ))}
          </div>
        </FormSection>
      </DrawerShell>
    </AppShell>
  );
}
