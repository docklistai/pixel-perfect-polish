import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
  DrawerShell,
  FormSection,
  FormRow,
} from "@/components/dl";
import {
  AlertTriangle,
  Plus,
  FileText,
  ChevronDown,
  ListChecks,
  AlertCircle,
  MessageCircle,
  Phone,
  Wrench,
  FileQuestion,
  MoreHorizontal,
} from "lucide-react";

export const Route = createFileRoute("/ops")({
  head: () => ({ meta: [{ title: "Operations — Docklist" }] }),
  component: OpsPage,
});

const stats = [
  { l: "Open tasks", v: "18", s: "6 due today", icon: ListChecks, tone: "info" },
  {
    l: "Incidents",
    v: "3",
    s: "1 high priority",
    icon: AlertTriangle,
    tone: "warning",
    danger: true,
  },
  { l: "Follow-ups", v: "7", s: "3 due today", icon: AlertCircle, tone: "info" },
  { l: "Handover notes", v: "2", s: "Updated this shift", icon: FileText, tone: "purple" },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  success: "bg-success-soft text-success",
};

const timeline = [
  {
    t: "08:15",
    title: "Daily briefing completed",
    area: "Front of House  ·  General",
    by: "By Sophie Carter",
    st: "Done",
    stTone: "success",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "08:40",
    title: "Guest request – Late checkout",
    area: "Room 302  ·  Service",
    who: { n: "Daniel Mitchell", img: 12 },
    prio: "Low",
    prioTone: "info",
    st: "In progress",
    stTone: "info",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "09:05",
    title: "Maintenance – Leaking tap",
    area: "Room 205  ·  Maintenance",
    who: { n: "Liam O'Connor", img: 13 },
    prio: "Medium",
    prioTone: "warning",
    st: "Open",
    stTone: "warning",
    dot: "warning",
    icon: FileText,
  },
  {
    t: "09:20",
    title: "Incident report – Guest slip in lobby",
    area: "Lobby  ·  Incident",
    who: { n: "Priya Patel", img: 47 },
    prio: "High",
    prioTone: "danger",
    st: "Open",
    stTone: "warning",
    dot: "danger",
    icon: AlertTriangle,
    highlight: true,
  },
  {
    t: "10:15",
    title: "Minibar restock",
    area: "All floors  ·  Housekeeping",
    who: { n: "Olivia Bennett", img: 16 },
    prio: "Low",
    prioTone: "info",
    st: "In progress",
    stTone: "info",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "10:45",
    title: "AC not cooling properly",
    area: "Room 412  ·  Maintenance",
    who: { n: "Liam O'Connor", img: 13 },
    prio: "Medium",
    prioTone: "warning",
    st: "Open",
    stTone: "warning",
    dot: "warning",
    icon: FileText,
  },
  {
    t: "11:30",
    title: "VIP arrival – Notes added",
    area: "Mr. James Wilson  ·  Front of House",
    who: { n: "Sophie Carter", img: 5 },
    prio: "Low",
    prioTone: "info",
    st: "Done",
    stTone: "success",
    dot: "info",
    icon: ListChecks,
  },
  {
    t: "12:05",
    title: "Broken wine glass",
    area: "Riverside Restaurant  ·  Incident",
    who: { n: "Daniel Mitchell", img: 12 },
    prio: "Low",
    prioTone: "info",
    st: "Closed",
    stTone: "info",
    dot: "info",
    icon: AlertTriangle,
  },
];

function OpsPage() {
  const [openDrawer, setOpenDrawer] = React.useState<null | "incident" | "task" | "handover">(null);

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        subtitle="Stay on top of today's activity and keep your team aligned."
        actions={
          <>
            <ActionButton icon={AlertTriangle} onClick={() => setOpenDrawer("incident")}>
              Log incident
            </ActionButton>
            <ActionButton variant="secondary" icon={Plus} onClick={() => setOpenDrawer("task")}>
              Add task
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={FileText}
              onClick={() => setOpenDrawer("handover")}
            >
              Add handover note
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {stats.map((s) => (
          <Card key={s.l} className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[s.tone]}`}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">{s.l}</div>
            </div>
            <div className="mt-3 text-3xl font-bold">{s.v}</div>
            <div className={`text-xs ${s.danger ? "text-danger" : "text-muted-foreground"} mt-1`}>
              {s.s}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-9 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-sm font-semibold">Operations timeline</div>
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
              Today <ChevronDown className="h-3 w-3" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                All categories <ChevronDown className="h-3 w-3" />
              </button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                All locations <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {timeline.map((e, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr] gap-3 items-center">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full`}
                    style={{ background: `var(--${e.dot})` }}
                  />
                  {e.t}
                </div>
                <div
                  className={`flex items-center gap-3 rounded-xl border border-border p-3 ${e.highlight ? "bg-danger-soft/30 border-danger/30" : ""}`}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneBg[e.dot === "danger" ? "warning" : e.dot]}`}
                  >
                    <e.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">{e.area}</div>
                    {e.by && <div className="text-[11px] text-muted-foreground">{e.by}</div>}
                  </div>
                  {e.who && (
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://i.pravatar.cc/64?img=${e.who.img}`}
                        className="h-7 w-7 rounded-full object-cover"
                        alt=""
                      />
                      <span className="text-sm">{e.who.n}</span>
                    </div>
                  )}
                  {e.prio && (
                    <span
                      className={`text-xs flex items-center gap-1`}
                      style={{ color: `var(--${e.prioTone})` }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {e.prio}
                    </span>
                  )}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${e.stTone === "success" ? "bg-success-soft text-success" : e.stTone === "info" ? "bg-info-soft text-info" : "bg-warning-soft text-warning"}`}
                  >
                    {e.st}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-xs text-brand font-semibold">
            Load more activity →
          </div>
        </Card>

        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Shift handover</div>
              <button type="button" className="text-xs text-brand">View all notes</button>
            </div>
            {[
              {
                from: "Morning shift",
                to: "Afternoon shift",
                who: "Sophie Carter · 12 May, 07:00",
                note: "Busy check-in period expected. VIP arrival at 14:00. Maintenance team aware of AC issues on 4th floor.",
                tag: "High priority",
                tone: "danger",
              },
              {
                from: "Afternoon shift",
                to: "Evening shift",
                who: "Daniel Mitchell · 12 May, 14:45",
                note: "Lobby is busier than usual. One maintenance job pending. Please follow up on minibar restock.",
                tag: "Medium priority",
                tone: "warning",
              },
            ].map((h, i) => (
              <div key={i} className="border-l-2 pl-3 py-2 border-brand">
                <div className="text-xs font-semibold">
                  {h.from} → {h.to}
                </div>
                <div className="text-[11px] text-muted-foreground">{h.who}</div>
                <p className="text-xs mt-1">{h.note}</p>
                <span
                  className={`mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${h.tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}
                >
                  {h.tag}
                </span>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">
                Urgent follow-ups{" "}
                <span className="ml-1 rounded bg-warning-soft text-warning text-[11px] px-1">
                  3
                </span>
              </div>
              <button type="button" className="text-xs text-brand">View all</button>
            </div>
            {[
              {
                t: "Incident report – Guest slip in lobby",
                w: "Sophie Carter · Due in 15m",
                p: "High",
                tone: "danger",
              },
              {
                t: "AC not cooling properly (Room 412)",
                w: "Liam O'Connor · Due in 1h",
                p: "Medium",
                tone: "warning",
              },
              {
                t: "Leaking tap (Room 205)",
                w: "Liam O'Connor · Due in 2h",
                p: "Medium",
                tone: "warning",
              },
            ].map((f) => (
              <div key={f.t} className="flex gap-3 py-2 border-t first:border-t-0 border-border">
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 ${f.tone === "danger" ? "text-danger" : "text-warning"}`}
                />
                <div className="flex-1">
                  <div className="text-xs font-medium">{f.t}</div>
                  <div className="text-[11px] text-muted-foreground">{f.w}</div>
                </div>
                <span
                  className={`text-[11px] font-semibold ${f.tone === "danger" ? "text-danger" : "text-warning"}`}
                >
                  {f.p}
                </span>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Quick reference</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { t: "Emergency contacts", icon: Phone, tone: "danger" },
                { t: "Maintenance log", icon: Wrench, tone: "info" },
                { t: "Property information", icon: FileText, tone: "info" },
                { t: "Lost & found", icon: FileQuestion, tone: "info" },
              ].map((q) => (
                <a
                  key={q.t}
                  className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-xs"
                >
                  <q.icon
                    className={`h-3.5 w-3.5 ${q.tone === "danger" ? "text-danger" : "text-brand"}`}
                  />{" "}
                  {q.t}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <DrawerShell
        open={!!openDrawer}
        onOpenChange={(o) => !o && setOpenDrawer(null)}
        title={
          openDrawer === "incident"
            ? "Log incident"
            : openDrawer === "task"
              ? "Add task"
              : "Add handover note"
        }
        description="Frontend example only — nothing is saved."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setOpenDrawer(null)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setOpenDrawer(null)}>Save</ActionButton>
          </>
        }
      >
        <FormSection title="Details">
          <FormRow label="Title" required>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </FormRow>
          {openDrawer === "incident" && (
            <FormRow label="Severity">
              <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </FormRow>
          )}
          {openDrawer === "task" && (
            <FormRow label="Due">
              <input
                type="date"
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              />
            </FormRow>
          )}
          <FormRow label="Notes">
            <textarea className="w-full min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </FormRow>
        </FormSection>
      </DrawerShell>
    </AppShell>
  );
}
