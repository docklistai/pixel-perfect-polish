import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
} from "@/components/dl";
import {
  Users, PoundSterling, Percent, TrendingUp, Star, AlertTriangle,
  Calendar, ArrowRight, Megaphone, Plus, ClockArrowUp, MoreHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Home — Docklist" }, { name: "description", content: "Weekly overview for your hospitality team." }] }),
  component: Home,
});

const overview = [
  { icon: Users, label: "Scheduled Hours", value: "1,248h", delta: "6% vs last week", up: true, tone: "info" },
  { icon: PoundSterling, label: "Labour Cost", value: "£18,420", delta: "3% vs last week", up: false, tone: "brand" },
  { icon: Percent, label: "Labour %", value: "28.6%", delta: "1.4pp vs last week", up: false, tone: "warning" },
  { icon: TrendingUp, label: "Sales vs Labour", value: "3.48", delta: "0.18 vs last week", up: true, tone: "purple" },
  { icon: Star, label: "Coverage", value: "98%", delta: "2pp vs last week", up: true, tone: "success" },
];

const toneBg: Record<string,string> = {
  info: "bg-info-soft text-info", brand: "bg-brand-soft text-brand",
  warning: "bg-warning-soft text-warning", purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success", danger: "bg-danger-soft text-danger",
};

function Home() {
  return (
    <AppShell>
      <PageHeader
        title={<>Good morning, Alex <span>👋</span></>}
        subtitle="Here's what's happening across Harbour View Hotel this week."
        actions={
          <>
            <ActionButton icon={Calendar}>Publish Rota</ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-9 p-6">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-4">WEEKLY OVERVIEW</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {overview.map((m) => (
              <div key={m.label} className="flex flex-col items-start">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${toneBg[m.tone]}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">{m.label}</div>
                <div className="mt-1 text-2xl font-bold tracking-tight">{m.value}</div>
                <div className={`mt-1 text-xs flex items-center gap-1 ${m.up ? "text-success" : "text-danger"}`}>
                  <ClockArrowUp className={`h-3 w-3 ${m.up ? "" : "rotate-180"}`} /> {m.delta}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-3 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">ATTENTION</div>
          <div className="space-y-2.5">
            {[
              { t: "3 Shifts are understaffed", s: "Today · View shifts" },
              { t: "2 Timesheets need approval", s: "Overdue · Review now" },
            ].map((a) => (
              <div key={a.t} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <div className="h-8 w-8 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">View all alerts (5) <ArrowRight className="h-3 w-3" /></a>
        </Card>

        {/* Row 2 */}
        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-widest text-muted-foreground mb-2">
            <span>LABOUR WATCH</span><span className="text-muted-foreground/70">vs target</span>
          </div>
          <div className="grid grid-cols-5 gap-3 items-center">
            <div className="col-span-2 relative h-32 flex items-end justify-center">
              <svg viewBox="0 0 120 70" className="w-full">
                <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="oklch(0.92 0.01 240)" strokeWidth="10" strokeLinecap="round" />
                <path d="M10,60 A50,50 0 0 1 95,28" fill="none" stroke="var(--brand)" strokeWidth="10" strokeLinecap="round" />
              </svg>
              <div className="absolute bottom-0 text-center">
                <div className="text-2xl font-bold">28.6%</div>
                <div className="text-[10px] text-muted-foreground">Target: 30.0%</div>
              </div>
            </div>
            <div className="col-span-3 text-sm space-y-2">
              <div><div className="text-xs text-muted-foreground">Total Labour Cost</div><div className="font-semibold">£18,420</div></div>
              <div><div className="text-xs text-muted-foreground">Sales</div><div className="font-semibold">£64,520</div></div>
              <div><div className="text-xs text-muted-foreground">Projected Labour %</div><div className="font-semibold text-brand">28.6%</div></div>
            </div>
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">Go to Labour Watch <ArrowRight className="h-3 w-3" /></a>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">UPCOMING ROTA PUBLISH</div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Week commencing</div>
              <div className="text-lg font-bold">19 May 2025</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Rota due by</div>
          <div className="text-sm font-semibold">Fri, 16 May 12:00</div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full w-2/3 bg-brand" /></div>
          <div className="mt-2 text-xs text-muted-foreground">2 days remaining</div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">Go to Rota <ArrowRight className="h-3 w-3" /></a>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">PENDING LEAVE APPROVALS</span>
            <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">3</span>
          </div>
          <div className="space-y-3">
            {[
              { n: "Sophie Carter", d: "18 – 20 May 2025  (3 days)", img: 5 },
              { n: "Daniel Mitchell", d: "26 – 27 May 2025  (2 days)", img: 12 },
              { n: "Priya Patel", d: "31 May – 02 Jun 2025  (3 days)", img: 47 },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3">
                <img src={`https://i.pravatar.cc/64?img=${p.img}`} className="h-8 w-8 rounded-full object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.n}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.d}</div>
                </div>
                <span className="text-xs text-brand font-medium">Annual Leave</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">Review leave requests <ArrowRight className="h-3 w-3" /></a>
        </Card>

        {/* Row 3 */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">UNAPPROVED TIMESHEETS</span>
            <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">5</span>
          </div>
          <div className="space-y-3">
            {[
              { n: "Emma Johnson", d: "5 – 11 May 2025", t: "2 days late", img: 9 },
              { n: "Liam O'Connor", d: "5 – 11 May 2025", t: "1 day late", img: 13 },
              { n: "Olivia Bennett", d: "5 – 11 May 2025", t: "1 day late", img: 16 },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-3">
                <img src={`https://i.pravatar.cc/64?img=${p.img}`} className="h-8 w-8 rounded-full object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.n}</div>
                  <div className="text-xs text-muted-foreground">{p.d}</div>
                </div>
                <span className="text-[11px] text-warning font-medium">{p.t}</span>
              </div>
            ))}
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">Review timesheets <ArrowRight className="h-3 w-3" /></a>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">STAFF ON SHIFT TODAY</span>
            <span className="rounded-md bg-muted text-foreground text-[11px] font-bold px-2 py-0.5">28</span>
          </div>
          <div className="space-y-3">
            {[["Front of House", 12], ["Kitchen", 9], ["Housekeeping", 4], ["Bar", 3]].map(([t, n]) => (
              <div key={t as string} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><Users className="h-4 w-4 text-muted-foreground" /></div>
                <div className="text-sm flex-1">{t}</div>
                <div className="text-sm font-semibold">{n}</div>
              </div>
            ))}
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">View live board <ArrowRight className="h-3 w-3" /></a>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">RECENT ANNOUNCEMENTS</div>
          <div className="space-y-3">
            {[
              { t: "New Summer Menu Launch", s: "Check out the new menu additions", a: "2 days ago", tone: "info" },
              { t: "Training: Upselling Workshop", s: "Tue, 20 May · 14:00 – 15:30", a: "3 days ago", tone: "warning" },
              { t: "Staff Party", s: "Sat, 24 May · 19:00 at Harbour Lounge", a: "5 days ago", tone: "purple" },
            ].map((a) => (
              <div key={a.t} className="flex gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[a.tone]}`}><Megaphone className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">{a.a}</div>
              </div>
            ))}
          </div>
          <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">View all announcements <ArrowRight className="h-3 w-3" /></a>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">QUICK ACTIONS</div>
          <div className="space-y-2">
            {[
              { t: "Add Shift", s: "Create an open shift", icon: Calendar },
              { t: "Add Leave Request", s: "Add a new leave request", icon: Plus },
              { t: "Clock In / Out", s: "Record time for a team member", icon: ClockArrowUp },
              { t: "Add Announcement", s: "Share news with your team", icon: Megaphone },
            ].map((a) => (
              <button key={a.t} className="w-full flex items-center gap-3 rounded-xl border border-border p-2.5 text-left hover:bg-muted/40 transition">
                <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center"><a.icon className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-[11px] text-muted-foreground">{a.s}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
