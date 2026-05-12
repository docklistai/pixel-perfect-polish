import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
  DrawerShell,
  ConfirmDialog,
  FormSection,
  FormRow,
  DetailRow,
  StatusBadge,
} from "@/components/dl";
import {
  Calendar,
  ChevronDown,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ArrowRight,
  Settings2,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/time")({
  head: () => ({ meta: [{ title: "Time & Attendance — Docklist" }] }),
  component: TimePage,
});

const stats = [
  {
    icon: Clock,
    label: "Clocked Hours",
    value: "312 h 45 m",
    sub: "vs last week",
    delta: "8%",
    up: true,
    tone: "info",
  },
  {
    icon: Users,
    label: "Pending Approvals",
    value: "18",
    sub2: "Entries",
    subline: "vs last week",
    delta: "4",
    up: false,
    tone: "warning",
  },
  {
    icon: AlertTriangle,
    label: "Lateness Flags",
    value: "7",
    sub2: "Events",
    subline: "vs last week",
    delta: "3",
    up: false,
    tone: "danger",
  },
  {
    icon: FileText,
    label: "Payroll Export Status",
    value: "Ready to Export",
    sub: "All approved entries included",
    tone: "success",
    isStatus: true,
  },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

const rows = [
  {
    n: "Sophie Carter",
    role: "Front of House",
    img: 5,
    sched: "08:00 – 16:00",
    in: "07:58",
    inN: "On time",
    out: "16:07",
    outN: "+ 7m",
    outTone: "warning",
    brk: "0:45",
    paid: "7 h 24 m",
    exc: "—",
    st: "Approved",
    stTone: "success",
  },
  {
    n: "Daniel Mitchell",
    role: "Kitchen",
    img: 12,
    sched: "10:00 – 18:00",
    in: "10:12",
    inN: "+ 12m",
    inTone: "warning",
    out: "18:05",
    outN: "− 7m",
    outTone: "danger",
    brk: "0:30",
    paid: "7 h 23 m",
    exc: "Late in",
    excTone: "danger",
    st: "Pending",
    stTone: "warning",
  },
  {
    n: "Priya Patel",
    role: "Housekeeping",
    img: 47,
    sched: "09:00 – 17:00",
    in: "08:59",
    inN: "On time",
    out: "17:03",
    outN: "+ 3m",
    outTone: "warning",
    brk: "0:30",
    paid: "7 h 34 m",
    exc: "—",
    st: "Approved",
    stTone: "success",
  },
  {
    n: "Liam O'Connor",
    role: "Bar",
    img: 13,
    sched: "16:00 – 00:00",
    in: "16:05",
    inN: "+ 5m",
    inTone: "warning",
    out: "23:55",
    outN: "− 5m",
    outTone: "danger",
    brk: "0:30",
    paid: "7 h 20 m",
    exc: "—",
    st: "Pending",
    stTone: "warning",
  },
  {
    n: "Olivia Bennett",
    role: "Front of House",
    img: 16,
    sched: "07:00 – 15:00",
    in: "07:00",
    inN: "On time",
    out: "15:00",
    outN: "On time",
    brk: "0:30",
    paid: "7 h 30 m",
    exc: "—",
    st: "Approved",
    stTone: "success",
  },
  {
    n: "James Walker",
    role: "Kitchen",
    img: 14,
    sched: "11:00 – 19:00",
    in: "—",
    inN: "Missing",
    inTone: "danger",
    out: "19:02",
    outN: "+ 2m",
    outTone: "warning",
    brk: "0:30",
    paid: "—",
    exc: "Missing in",
    excTone: "danger",
    st: "Unapproved",
    stTone: "muted",
  },
  {
    n: "Emily Rogers",
    role: "Housekeeping",
    img: 31,
    sched: "08:30 – 16:30",
    in: "08:34",
    inN: "+ 4m",
    inTone: "warning",
    out: "16:36",
    outN: "+ 6m",
    outTone: "warning",
    brk: "0:45",
    paid: "7 h 17 m",
    exc: "Late in",
    excTone: "danger",
    st: "Pending",
    stTone: "warning",
  },
  {
    n: "Noah Ahmed",
    role: "Bar",
    img: 33,
    sched: "15:00 – 23:00",
    in: "14:58",
    inN: "On time",
    out: "23:01",
    outN: "+ 1m",
    outTone: "warning",
    brk: "0:30",
    paid: "7 h 33 m",
    exc: "—",
    st: "Approved",
    stTone: "success",
  },
];

const stTones: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-danger-soft text-danger",
};
const noteTones: Record<string, string> = { warning: "text-warning", danger: "text-danger" };

function TimePage() {
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  return (
    <AppShell>
      <PageHeader
        title="Time & Attendance"
        subtitle="Review, approve and export time data for payroll."
        actions={
          <>
            <ActionButton onClick={() => setReviewOpen(true)}>Review timesheet</ActionButton>
            <ActionButton variant="secondary" icon={Download} onClick={() => setExportOpen(true)}>
              Export Payroll-Ready CSV
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-xl border border-border bg-card px-3 py-2 text-sm flex items-center gap-2 shadow-[var(--shadow-card)]">
              <Calendar className="h-4 w-4 text-brand" /> 12 – 18 May 2025{" "}
              <ChevronDown className="h-4 w-4" />
            </button>
            <button className="rounded-xl border border-border bg-card px-3 py-2 text-sm flex items-center gap-2 shadow-[var(--shadow-card)]">
              <Users className="h-4 w-4" /> All Teams <ChevronDown className="h-4 w-4" />
            </button>
            <button className="rounded-xl border border-border bg-card px-3 py-2 text-sm flex items-center gap-2 shadow-[var(--shadow-card)]">
              <Settings2 className="h-4 w-4" /> More Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[s.tone]}`}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">{s.label}</div>
                </div>
                {s.isStatus ? (
                  <>
                    <div className="mt-3 flex items-center gap-2 text-success font-semibold">
                      <CheckCircle2 className="h-5 w-5" /> Ready to Export
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
                  </>
                ) : (
                  <>
                    <div className="mt-3 text-2xl font-bold">
                      {s.value}{" "}
                      {s.sub2 && (
                        <span className="text-sm font-normal text-muted-foreground">{s.sub2}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.subline ?? s.sub}{" "}
                      <span
                        className={`ml-1 font-semibold ${s.up ? "text-success" : "text-danger"}`}
                      >
                        {s.up ? "↑" : "↓"} {s.delta}
                      </span>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">Weekly Timesheet</span>{" "}
                <span className="text-xs text-muted-foreground ml-1">20 staff</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-xl border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5" /> Column Settings
                </button>
                <button className="rounded-xl border border-border p-1.5">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground border-y border-border">
                  <th className="py-2 px-2 text-left w-8">
                    <input type="checkbox" />
                  </th>
                  <th className="py-2 text-left">Staff</th>
                  <th className="py-2 text-left">
                    Scheduled
                    <div className="font-normal normal-case tracking-normal text-[10px]">
                      Start − End
                    </div>
                  </th>
                  <th className="py-2 text-left">
                    Clock In
                    <div className="font-normal normal-case tracking-normal text-[10px]">
                      Actual
                    </div>
                  </th>
                  <th className="py-2 text-left">
                    Clock Out
                    <div className="font-normal normal-case tracking-normal text-[10px]">
                      Actual
                    </div>
                  </th>
                  <th className="py-2 text-left">
                    Breaks
                    <div className="font-normal normal-case tracking-normal text-[10px]">
                      Unpaid
                    </div>
                  </th>
                  <th className="py-2 text-left">Paid Hours</th>
                  <th className="py-2 text-left">Exceptions</th>
                  <th className="py-2 text-left">Approval</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n} className="border-b border-border/60 last:border-0">
                    <td className="py-3 px-2">
                      <input type="checkbox" />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://i.pravatar.cc/64?img=${r.img}`}
                          className="h-7 w-7 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <div className="font-medium">{r.n}</div>
                          <div className="text-[11px] text-muted-foreground">{r.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">{r.sched}</td>
                    <td className="py-3">
                      <div>{r.in}</div>
                      <div
                        className={`text-[11px] ${r.inTone ? noteTones[r.inTone] : "text-muted-foreground"}`}
                      >
                        {r.inN}
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{r.out}</div>
                      <div
                        className={`text-[11px] ${r.outTone ? noteTones[r.outTone] : "text-muted-foreground"}`}
                      >
                        {r.outN}
                      </div>
                    </td>
                    <td className="py-3">{r.brk}</td>
                    <td className="py-3">{r.paid}</td>
                    <td className="py-3">
                      {r.exc === "—" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={`rounded-md px-2 py-0.5 text-[11px] ${stTones.danger}`}>
                          {r.exc}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${stTones[r.stTone]}`}
                      >
                        {r.st}
                      </span>
                    </td>
                    <td className="py-3">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
              <span>Showing 1 to 8 of 20 staff</span>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 rounded-md border border-border flex items-center justify-center">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {["1", "2", "3"].map((p) => (
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
              <span className="flex items-center gap-2">
                Show{" "}
                <button className="rounded-md border border-border px-2 py-1 flex items-center gap-1">
                  10 <ChevronDown className="h-3 w-3" />
                </button>
              </span>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Attendance Trends</span>
              <button className="text-xs text-muted-foreground flex items-center gap-1">
                This week <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Attendance Rate</div>
                <div className="text-2xl font-bold">95.3%</div>
                <div className="text-[11px] text-success">↑ 2.1% vs last week</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg. Paid Hours / Day</div>
                <div className="text-2xl font-bold">7 h 43 m</div>
                <div className="text-[11px] text-muted-foreground">↑ 0 h 18 m vs last week</div>
              </div>
            </div>
            <svg viewBox="0 0 200 60" className="w-full h-20">
              <polyline
                fill="none"
                stroke="var(--info)"
                strokeWidth="2"
                points="0,40 30,30 60,35 90,25 120,28 150,22 180,25 200,20"
              />
              {[0, 30, 60, 90, 120, 150, 180, 200].map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={[40, 30, 35, 25, 28, 22, 25, 20][i]}
                  r="2.5"
                  fill="var(--info)"
                />
              ))}
            </svg>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <button type="button" className="mt-3 block text-xs font-semibold text-brand">
              View full attendance report →
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Missed Clock-Ins</span>
              <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">
                3
              </span>
            </div>
            {[
              { n: "James Walker", t: "Today, 11:00", img: 14 },
              { n: "Ava Thompson", t: "Yesterday, 09:00", img: 23 },
              { n: "Mason Clark", t: "15 May 2025, 16:00", img: 51 },
            ].map((p) => (
              <div
                key={p.n}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <img
                  src={`https://i.pravatar.cc/64?img=${p.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.n}</div>
                  <div className="text-[11px] text-muted-foreground">{p.t}</div>
                </div>
                <span className="rounded-md bg-danger-soft text-danger text-[11px] px-2 py-0.5">
                  Missing in
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
            <button type="button" className="mt-3 block text-xs font-semibold text-brand">
              View all (3) →
            </button>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Recent Disputes</span>
              <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">
                2
              </span>
            </div>
            {[
              {
                n: "Liam O'Connor",
                t: "Overtime - 10 May 2025",
                st: "Open",
                stTone: "danger",
                img: 13,
              },
              {
                n: "Emily Rogers",
                t: "Missing Break - 8 May 2025",
                st: "Under Review",
                stTone: "info",
                img: 31,
              },
            ].map((p) => (
              <div
                key={p.n}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <img
                  src={`https://i.pravatar.cc/64?img=${p.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.n}</div>
                  <div className="text-[11px] text-muted-foreground">{p.t}</div>
                </div>
                <span
                  className={`text-[11px] ${p.stTone === "danger" ? "text-danger" : "text-info"} font-medium`}
                >
                  {p.st}
                </span>
              </div>
            ))}
            <button type="button" className="mt-3 block text-xs font-semibold text-brand">
              View all disputes →
            </button>
          </Card>
        </div>
      </div>

      {/* Timesheet approval drawer */}
      <DrawerShell
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Emma Johnson — Week of 12 May 2025"
        description="Front of House · Harbour View Hotel"
        meta={<StatusBadge tone="warning">Needs review</StatusBadge>}
        width="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setReviewOpen(false)}>
              Reject
            </ActionButton>
            <ActionButton onClick={() => setReviewOpen(false)}>Approve timesheet</ActionButton>
          </>
        }
      >
        <FormSection title="Summary">
          <dl className="divide-y divide-border">
            <DetailRow label="Scheduled" value="38h 00m" />
            <DetailRow label="Clocked" value="39h 12m" />
            <DetailRow label="Variance" value="+1h 12m" />
            <DetailRow label="Lateness flags" value="2" />
          </dl>
        </FormSection>
        <FormSection title="Adjustments" description="Edits are mock-only.">
          <FormRow label="Manager note">
            <textarea
              className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Add a note for payroll..."
            />
          </FormRow>
        </FormSection>
      </DrawerShell>

      {/* Export payroll-ready CSV confirmation */}
      <ConfirmDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export payroll-ready CSV?"
        description="Generates a CSV for the week of 12 – 18 May 2025 (Europe/London). Frontend example only — no file will be downloaded."
        confirmLabel="Export CSV"
        onConfirm={() => setExportOpen(false)}
      />
    </AppShell>
  );
}
