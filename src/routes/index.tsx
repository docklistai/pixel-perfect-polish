import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  ActionButton,
  IconButton,
  DrawerShell,
  DetailRow,
  FormSection,
  FormRow,
  StatusBadge,
} from "@/components/dl";
import {
  Users,
  PoundSterling,
  Percent,
  TrendingUp,
  Star,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Megaphone,
  Plus,
  Clock3,
  MoreHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Docklist" },
      { name: "description", content: "Weekly overview for your hospitality team." },
    ],
  }),
  component: Home,
});

const overview = [
  {
    icon: Users,
    label: "Scheduled Hours",
    value: "1,248h",
    delta: "6% vs last week",
    up: true,
    tone: "info",
  },
  {
    icon: PoundSterling,
    label: "Labour Cost",
    value: "£18,420",
    delta: "3% vs last week",
    up: false,
    tone: "brand",
  },
  {
    icon: Percent,
    label: "Labour %",
    value: "28.6%",
    delta: "1.4pp vs last week",
    up: false,
    tone: "warning",
  },
  {
    icon: TrendingUp,
    label: "Sales vs Labour",
    value: "3.48",
    delta: "0.18 vs last week",
    up: true,
    tone: "purple",
  },
  {
    icon: Star,
    label: "Coverage",
    value: "98%",
    delta: "2pp vs last week",
    up: true,
    tone: "success",
  },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

function Home() {
  const [alertOpen, setAlertOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState<null | { t: string; s: string }>(null);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="dock-section-eyebrow">Dashboard</div>
          <h1 className="mt-2 text-balance text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">
            Good morning, Alex <span>👋</span>
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Here's what's happening across Harbour View Hotel this week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <ActionButton icon={Calendar}>Publish Rota</ActionButton>
          <IconButton icon={MoreHorizontal} label="More actions" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="dock-section-eyebrow">Weekly overview</div>
            <div className="text-xs text-muted-foreground">Live rota health</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {overview.map((m) => (
              <div key={m.label} className="flex min-w-0 flex-col gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-[14px] ${toneBg[m.tone]}`}
                >
                  <m.icon className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
                  {m.label}
                </div>
                <div className="text-[24px] font-semibold tracking-tight">{m.value}</div>
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    m.up ? "text-success" : "text-danger"
                  }`}
                >
                  {m.up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  <span>{m.delta}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="dock-section-eyebrow">Attention</div>
            <StatusBadge tone="warning">5</StatusBadge>
          </div>
          <div className="mt-3 space-y-2.5">
            {[
              { t: "3 Shifts are understaffed", s: "Today · View shifts" },
              { t: "2 Timesheets need approval", s: "Overdue · Review now" },
            ].map((a) => (
              <button
                key={a.t}
                onClick={() => setAlertOpen(true)}
                className="flex w-full items-start gap-3 rounded-[10px] border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-warning/10 bg-warning-soft text-warning">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand"
          >
            View all alerts (5) <ArrowRight className="h-3 w-3" />
          </button>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <div className="dock-section-eyebrow">Labour watch</div>
              <div className="grow" />
              <div className="text-xs text-muted-foreground">vs target</div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex h-[100px] w-[160px] items-end justify-center">
                <svg viewBox="0 0 120 70" className="w-full">
                  <path
                    d="M10,60 A50,50 0 0 1 110,60"
                    fill="none"
                    stroke="oklch(0.92 0.01 240)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10,60 A50,50 0 0 1 95,28"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute bottom-0 text-center">
                  <div className="text-[24px] font-semibold tracking-tight">28.6%</div>
                  <div className="text-[10px] text-muted-foreground">Target: 30.0%</div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total Labour Cost</div>
                  <div className="text-[18px] font-semibold">£18,420</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Sales</div>
                  <div className="text-[18px] font-semibold">£64,520</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Projected Labour %</div>
                  <div className="text-[18px] font-semibold text-brand">28.6%</div>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              Go to Labour Watch <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="dock-section-eyebrow">Upcoming rota publish</div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Week commencing</div>
                <div className="text-[22px] font-semibold tracking-tight">19 May 2025</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">Rota due by</div>
              <div className="text-[15px] font-semibold">Fri, 16 May 12:00</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-2/3 bg-brand" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">2 days remaining</div>
            </div>
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              Go to Rota <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="dock-section-eyebrow">Pending leave approvals</div>
              <StatusBadge tone="warning">3</StatusBadge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { n: "Sophie Carter", d: "18 – 20 May 2025  (3 days)", img: 5 },
              { n: "Daniel Mitchell", d: "26 – 27 May 2025  (2 days)", img: 12 },
              { n: "Priya Patel", d: "31 May – 02 Jun 2025  (3 days)", img: 47 },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3 px-5 py-3.5">
                <img
                  src={`https://i.pravatar.cc/64?img=${p.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.n}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.d}</div>
                </div>
                <span className="text-xs font-medium text-brand">Annual Leave</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              Review leave requests <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="dock-section-eyebrow">Unapproved timesheets</div>
              <StatusBadge tone="warning">5</StatusBadge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { n: "Emma Johnson", d: "5 – 11 May 2025", t: "2 days late", img: 9 },
              { n: "Liam O'Connor", d: "5 – 11 May 2025", t: "1 day late", img: 13 },
              { n: "Olivia Bennett", d: "5 – 11 May 2025", t: "1 day late", img: 16 },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3 px-5 py-3.5">
                <img
                  src={`https://i.pravatar.cc/64?img=${p.img}`}
                  className="h-8 w-8 rounded-full object-cover"
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.n}</div>
                  <div className="text-xs text-muted-foreground">{p.d}</div>
                </div>
                <span className="text-[11px] font-medium text-warning">{p.t}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              Review timesheets <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="dock-section-eyebrow">Staff on shift today</div>
              <StatusBadge tone="muted">28</StatusBadge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              ["Front of House", 12],
              ["Kitchen", 9],
              ["Housekeeping", 4],
              ["Bar", 3],
            ].map(([t, n]) => (
              <div key={t as string} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-sm">{t}</div>
                <div className="text-sm font-semibold">{n}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              View live board <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="dock-section-eyebrow">Recent announcements</div>
          </div>
          <div className="divide-y divide-border">
            {[
              {
                t: "New Summer Menu Launch",
                s: "Check out the new menu additions",
                a: "2 days ago",
                tone: "info",
              },
              {
                t: "Training: Upselling Workshop",
                s: "Tue, 20 May · 14:00 – 15:30",
                a: "3 days ago",
                tone: "warning",
              },
              {
                t: "Staff Party",
                s: "Sat, 24 May · 19:00 at Harbour Lounge",
                a: "5 days ago",
                tone: "purple",
              },
            ].map((a) => (
              <div key={a.t} className="flex gap-3 px-5 py-3.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] ${toneBg[a.tone]}`}
                >
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
                <div className="text-[11px] whitespace-nowrap text-muted-foreground">{a.a}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
            >
              View all announcements <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="dock-section-eyebrow">Quick actions</div>
          </div>
          <div className="divide-y divide-border">
            {[
              { t: "Add Shift", s: "Create an open shift", icon: Calendar },
              { t: "Add Leave Request", s: "Add a new leave request", icon: Plus },
              { t: "Clock In / Out", s: "Record time for a team member", icon: Clock3 },
              { t: "Add Announcement", s: "Share news with your team", icon: Megaphone },
            ].map((a) => (
              <button
                key={a.t}
                onClick={() => setQuickOpen({ t: a.t, s: a.s })}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-[11px] text-muted-foreground">{a.s}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-7 text-center text-xs text-muted-foreground">
        All times shown in Europe/London (GMT+1)
      </div>

      {/* Alert detail drawer */}
      <DrawerShell
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="3 shifts are understaffed"
        description="Today · Harbour View Hotel"
        meta={<StatusBadge tone="warning">Needs attention</StatusBadge>}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setAlertOpen(false)}>
              Dismiss
            </ActionButton>
            <ActionButton onClick={() => setAlertOpen(false)}>Open rota</ActionButton>
          </>
        }
      >
        <FormSection title="Affected shifts">
          <dl className="divide-y divide-border">
            <DetailRow label="Bar — Evening" value="Sat 17 May · 17:00–23:00 · 2 of 3 filled" />
            <DetailRow label="Front of House" value="Sat 17 May · 12:00–20:00 · 4 of 5 filled" />
            <DetailRow label="Kitchen — Late" value="Sun 18 May · 18:00–00:00 · 3 of 4 filled" />
          </dl>
        </FormSection>
        <FormSection title="Suggested next step" description="Mock recommendation only.">
          <p className="text-xs text-muted-foreground">
            Auto-fill from your standby pool, or post these shifts as open for staff to claim.
          </p>
        </FormSection>
      </DrawerShell>

      {/* Quick action example drawer */}
      <DrawerShell
        open={!!quickOpen}
        onOpenChange={(o) => !o && setQuickOpen(null)}
        title={quickOpen?.t ?? ""}
        description={quickOpen?.s}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setQuickOpen(null)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setQuickOpen(null)}>Save</ActionButton>
          </>
        }
      >
        <FormSection title="Details">
          <FormRow label="Title" required>
            <input
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              defaultValue={quickOpen?.t}
            />
          </FormRow>
          <FormRow label="Notes" hint="Visible to managers only.">
            <textarea
              className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Add a note..."
            />
          </FormRow>
        </FormSection>
        <p className="text-[11px] text-muted-foreground">
          This is a frontend example. No data is saved.
        </p>
      </DrawerShell>
    </AppShell>
  );
}
