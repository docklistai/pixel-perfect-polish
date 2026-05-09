import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { Calendar, ArrowRight, AlertTriangle, MoreHorizontal, Heart, UserCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave — Docklist" }] }),
  component: LeavePage,
});

const top = [
  { l: "PENDING REQUESTS", v: "4", s: "Awaiting your review", a: "Review requests", icon: UserCheck, tone: "warning" },
  { l: "APPROVED UPCOMING", v: "18", s: "In the next 30 days", a: "View calendar", icon: Calendar, tone: "info" },
  { l: "SICKNESS / ABSENCE TODAY", v: "2", s: "2.6% of scheduled shifts", a: "View today", icon: Heart, tone: "purple" },
  { l: "COVERAGE RISK", v: "Medium", s: "5 shifts at risk", a: "View risk report", icon: AlertTriangle, tone: "warning", isText: true },
];

const toneBg: Record<string,string> = {
  warning: "bg-warning-soft text-warning", info: "bg-info-soft text-info",
  purple: "bg-accent-purple-soft text-accent-purple",
};

const requests = [
  { n: "Sophie Carter", role: "Senior Receptionist", date: "18 – 20 May 2025", dur: "3 days", impact: "Low", tone: "success", img: 5 },
  { n: "Daniel Mitchell", role: "Head Chef", date: "26 – 27 May 2025", dur: "2 days", impact: "Medium", tone: "warning", img: 12 },
  { n: "Priya Patel", role: "Housekeeping Supervisor", date: "31 May – 02 Jun 2025", dur: "3 days", impact: "High", tone: "danger", img: 47 },
  { n: "Liam O'Connor", role: "Bartender", date: "5 – 11 May 2025", dur: "7 days", impact: "Medium", tone: "warning", img: 13 },
];

const cal = [
  { n: "Sophie Carter", dept: "Front Office", img: 5, range: [0, 4], type: "annual" },
  { n: "Daniel Mitchell", dept: "Kitchen", img: 12, range: [4, 7], type: "annual" },
  { n: "Priya Patel", dept: "Housekeeping", img: 47, range: [6, 9], type: "annual" },
  { n: "Emma Johnson", dept: "Front Office", img: 9, range: [3, 8], type: "unavail" },
  { n: "Olivia Bennett", dept: "Housekeeping", img: 16, range: [8, 11], type: "annual" },
  { n: "Liam O'Connor", dept: "Bar", img: 13, range: [9, 13], type: "annual" },
];

const days = ["M","T","W","T","F","S","S","M","T","W","T","F","S","S"];
const dates = [12,13,14,15,16,17,18,19,20,21,22,23,24,25];

function LeavePage() {
  return (
    <AppShell>
      <PageHeader
        title="Leave"
        subtitle="Manage leave requests, availability and ensure we're covered."
        actions={
          <>
            <ActionButton icon={Calendar}>Request Leave</ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {top.map((t) => (
          <Card key={t.l} className="p-5">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">{t.l}</div>
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${toneBg[t.tone]}`}><t.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-2xl font-bold">{t.v}</div>
                <div className="text-xs text-muted-foreground">{t.s}</div>
              </div>
            </div>
            <a className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand">{t.a} <ArrowRight className="h-3 w-3" /></a>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-3 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-2">LEAVE REQUEST INBOX</div>
          <div className="border-b border-border flex gap-4 text-xs mb-3">
            <button className="pb-2 border-b-2 border-brand text-brand font-semibold">Needs review <span className="ml-1 rounded bg-brand-soft text-brand px-1">4</span></button>
            <button className="pb-2 text-muted-foreground">All requests</button>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-2">
            <button className="rounded-md border border-border px-2 py-0.5">Filter</button>
            <button>Sort: Newest ↓</button>
          </div>
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.n} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2.5">
                  <img src={`https://i.pravatar.cc/64?img=${r.img}`} className="h-8 w-8 rounded-full object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.n}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.role}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <div>
                    <div className="font-medium">{r.date}</div>
                    <div className="text-muted-foreground">{r.dur}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Rota impact</div>
                    <div className={`font-medium flex items-center gap-1 justify-end ${r.tone === "danger" ? "text-danger" : r.tone === "warning" ? "text-warning" : "text-success"}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {r.impact}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button className="flex-1 rounded-lg border border-border py-1.5 text-xs">Decline</button>
                  <button className="flex-1 rounded-lg bg-brand-soft text-brand py-1.5 text-xs font-semibold">Approve</button>
                </div>
              </div>
            ))}
          </div>
          <a className="mt-3 block text-xs font-semibold text-brand">View all requests →</a>
        </Card>

        <Card className="col-span-12 lg:col-span-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">MAY – JUNE 2025</div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
              <button className="px-3 py-1 rounded-md hover:bg-muted">Week</button>
              <button className="px-3 py-1 rounded-md bg-muted">2 Weeks</button>
            </div>
          </div>
          <div className="grid grid-cols-[140px_repeat(14,1fr)] text-[10px] text-muted-foreground border-b border-border pb-1">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">STAFF MEMBER</div>
            {days.map((d, i) => (
              <div key={i} className="text-center"><div>{d}</div><div className="text-foreground font-medium">{dates[i]}</div></div>
            ))}
          </div>
          {cal.map((c) => (
            <div key={c.n} className="grid grid-cols-[140px_repeat(14,1fr)] items-center py-2 border-b last:border-b-0 border-border/60">
              <div className="flex items-center gap-2 pr-2">
                <img src={`https://i.pravatar.cc/64?img=${c.img}`} className="h-7 w-7 rounded-full object-cover" alt="" />
                <div className="min-w-0"><div className="text-xs font-medium truncate">{c.n}</div><div className="text-[10px] text-muted-foreground truncate">{c.dept}</div></div>
              </div>
              <div className="col-span-14 grid grid-cols-14 relative h-7">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md text-[10px] flex items-center px-2 ${
                    c.type === "annual" ? "bg-success-soft text-success border border-success/30" : "bg-muted text-muted-foreground border border-border"
                  }`}
                  style={{ left: `${(c.range[0] / 14) * 100}%`, width: `${((c.range[1] - c.range[0] + 1) / 14) * 100}%`,
                    backgroundImage: c.type === "unavail" ? "repeating-linear-gradient(45deg, transparent, transparent 4px, oklch(0.92 0.01 240) 4px, oklch(0.92 0.01 240) 8px)" : undefined }}
                >
                  {c.type === "annual" ? "Annual Leave" : "Unavailable"}
                </div>
              </div>
            </div>
          ))}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-success-soft border border-success/30" /> Approved leave</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded border border-border" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, oklch(0.92 0.01 240) 4px, oklch(0.92 0.01 240) 8px)" }} /> Unavailable</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-warning-soft border border-warning/30" /> Pending request</span>
          </div>
        </Card>

        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">MY AVAILABILITY</div>
            <div className="flex items-center justify-between mb-2"><div className="text-xs font-semibold">Recurring availability</div><a className="text-xs text-brand">Edit</a></div>
            {[
              ["Mon", "Unavailable"], ["Tue", "09:00 – 17:00"], ["Wed", "09:00 – 17:00"],
              ["Thu", "Unavailable"], ["Fri", "09:00 – 17:00"], ["Sat", "10:00 – 16:00"], ["Sun", "Unavailable"],
            ].map(([d, v]) => (
              <div key={d} className="flex justify-between text-xs py-1"><span className="font-medium">{d}</span><span className="text-muted-foreground">{v}</span></div>
            ))}
            <div className="mt-3 flex items-center justify-between"><div className="text-xs font-semibold">Unavailable dates</div><a className="text-xs text-brand flex items-center gap-1"><Plus className="h-3 w-3" /> Add</a></div>
            <div className="mt-1 text-xs"><div className="flex justify-between"><span>24 – 26 May 2025</span><span className="text-muted-foreground">Personal</span></div><div className="flex justify-between"><span>14 Jun 2025</span><span className="text-muted-foreground">All day</span></div></div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">LEAVE ALERTS</span>
              <span className="rounded-md bg-warning-soft text-warning text-[11px] font-bold px-2 py-0.5">2</span>
            </div>
            {[
              { l: "A", t: "Rota clash", s: "Kitchen has limited coverage on 26 May.", link: "Review rota", tone: "warning" },
              { l: "♥", t: "High leave period", s: "18% of team on leave 24 – 31 May.", link: "See coverage", tone: "purple" },
            ].map((a) => (
              <div key={a.t} className="flex gap-3 py-2 border-t first:border-t-0 border-border">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold ${a.tone === "warning" ? "bg-warning-soft text-warning" : "bg-accent-purple-soft text-accent-purple"}`}>{a.l}</div>
                <div className="flex-1"><div className="text-sm font-medium">{a.t}</div><div className="text-[11px] text-muted-foreground">{a.s}</div><a className="text-[11px] text-brand font-semibold">{a.link} →</a></div>
              </div>
            ))}
          </Card>
        </div>

        {/* Bottom row */}
        <Card className="col-span-12 lg:col-span-6 p-5">
          <div className="flex items-center justify-between mb-3"><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">LEAVE INSIGHTS</div><button className="rounded-md border border-border px-2 py-1 text-xs">This month ▾</button></div>
          <div className="grid grid-cols-4 gap-4">
            {[
              ["Total days booked", "46", "↑ 12% vs last month"],
              ["Available days", "284", "↑ 5% vs last month"],
              ["Most common type", "Annual Leave", "76% of days"],
              ["Average request notice", "10.4 days", "↑ 2.1 vs last month"],
            ].map(([l, v, s]) => (
              <div key={l}><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold mt-1">{v}</div><div className="text-[11px] text-success">{s}</div></div>
            ))}
          </div>
          <a className="mt-4 block text-xs font-semibold text-brand">View full leave report →</a>
        </Card>

        <Card className="col-span-12 lg:col-span-6 p-5">
          <div className="flex items-center justify-between mb-3"><div className="text-[11px] font-semibold tracking-widest text-muted-foreground">TEAM COVERAGE OVERVIEW</div><button className="rounded-md border border-border px-2 py-1 text-xs">Next 14 days ▾</button></div>
          <div className="grid grid-cols-3 gap-6">
            {[
              ["Good coverage", "85%", "success"],
              ["At risk", "10%", "warning"],
              ["Undercovered", "5%", "danger"],
            ].map(([l, v, tone]) => (
              <div key={l}><div className="text-xs text-muted-foreground">{l}</div><div className={`text-xl font-bold mt-1 text-${tone}`} style={{ color: `var(--${tone})` }}>{v}</div></div>
            ))}
          </div>
          <div className="mt-3 h-3 rounded-full overflow-hidden flex">
            <div style={{ width: "85%", background: "var(--success)" }} />
            <div style={{ width: "10%", background: "var(--warning)" }} />
            <div style={{ width: "5%", background: "var(--danger)" }} />
          </div>
          <a className="mt-4 block text-xs font-semibold text-brand">View coverage report →</a>
        </Card>
      </div>
    </AppShell>
  );
}
