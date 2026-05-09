import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  IconButton,
  FilterButton,
} from "@/components/dl";
import {
  ChevronDown,
  Filter,
  Sparkles,
  SlidersHorizontal,
  AlertTriangle,
  CircleAlert,
  Plane,
  Send,
  Share2,
  Plus,
  MoreHorizontal,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/rota")({
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const days = [
  { d: "Mon 12 May", h: "112h", c: "94%", tone: "muted" },
  { d: "Tue 13 May", h: "128h", c: "100%", tone: "muted" },
  { d: "Wed 14 May", h: "120h", c: "92%", tone: "muted" },
  { d: "Thu 15 May", h: "134h", c: "103%", tone: "warning" },
  { d: "Fri 16 May", h: "142h", c: "109%", tone: "warning" },
  { d: "Sat 17 May", h: "156h", c: "118%", tone: "danger" },
  { d: "Sun 18 May", h: "110h", c: "89%", tone: "warning" },
];

type Shift = { time: string; role: string; tone: string; flag?: "conflict" | "open" | "off" };
const off: Shift = { time: "—", role: "Day off", tone: "off", flag: "off" };

const staff: {
  name: string;
  role: string;
  hrs: string;
  img: number;
  tone: string;
  shifts: Shift[];
}[] = [
  {
    name: "Sophie Carter",
    role: "Manager",
    hrs: "32h",
    img: 5,
    tone: "info",
    shifts: [
      { time: "8am – 4pm", role: "Manager", tone: "info" },
      { time: "8am – 4pm", role: "Manager", tone: "info" },
      { time: "9am – 5pm", role: "Manager", tone: "info" },
      { time: "8am – 4pm", role: "Manager", tone: "info" },
      { time: "8am – 4pm", role: "Manager", tone: "info" },
      { time: "10am – 6pm", role: "Manager", tone: "info" },
      off,
    ],
  },
  {
    name: "Daniel Mitchell",
    role: "Supervisor",
    hrs: "35h",
    img: 12,
    tone: "info",
    shifts: [
      { time: "9am – 5pm", role: "Supervisor", tone: "info" },
      { time: "9am – 5pm", role: "Supervisor", tone: "info" },
      off,
      { time: "1pm – 9pm", role: "Supervisor", tone: "info" },
      { time: "1pm – 9pm", role: "Supervisor", tone: "info", flag: "conflict" },
      { time: "1pm – 9pm", role: "Supervisor", tone: "info" },
      { time: "9am – 5pm", role: "Supervisor", tone: "info" },
    ],
  },
  {
    name: "Priya Patel",
    role: "Head Chef",
    hrs: "40h",
    img: 47,
    tone: "warning",
    shifts: [
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
      off,
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
      { time: "6am – 2pm", role: "Head Chef", tone: "warning" },
    ],
  },
  {
    name: "Liam O'Connor",
    role: "Bartender",
    hrs: "25h",
    img: 13,
    tone: "warning",
    shifts: [
      { time: "4pm – 12am", role: "Bartender", tone: "warning" },
      { time: "4pm – 12am", role: "Bartender", tone: "warning" },
      { time: "4pm – 12am", role: "Bartender", tone: "warning", flag: "conflict" },
      off,
      { time: "Open shift", role: "Bartender", tone: "open", flag: "open" },
      { time: "4pm – 12am", role: "Bartender", tone: "warning" },
      { time: "4pm – 12am", role: "Bartender", tone: "warning" },
    ],
  },
  {
    name: "Olivia Bennett",
    role: "Barista",
    hrs: "20h",
    img: 16,
    tone: "info",
    shifts: [
      { time: "7am – 3pm", role: "Barista", tone: "info" },
      off,
      { time: "7am – 3pm", role: "Barista", tone: "info" },
      { time: "7am – 3pm", role: "Barista", tone: "info" },
      off,
      { time: "8am – 4pm", role: "Barista", tone: "info" },
      { time: "8am – 4pm", role: "Barista", tone: "info" },
    ],
  },
  {
    name: "James Walker",
    role: "Waiting Staff",
    hrs: "20h",
    img: 14,
    tone: "purple",
    shifts: [
      { time: "11am – 7pm", role: "Waiter", tone: "purple" },
      { time: "11am – 7pm", role: "Waiter", tone: "purple" },
      off,
      { time: "11am – 7pm", role: "Waiter", tone: "purple" },
      { time: "11am – 7pm", role: "Waiter", tone: "purple" },
      { time: "11am – 7pm", role: "Waiter", tone: "purple" },
      off,
    ],
  },
  {
    name: "Amelia Stone",
    role: "Housekeeping",
    hrs: "30h",
    img: 23,
    tone: "danger",
    shifts: [
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
      off,
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
      { time: "9am – 5pm", role: "Housekeeping", tone: "danger" },
    ],
  },
  {
    name: "Noah Evans",
    role: "Porter",
    hrs: "15h",
    img: 33,
    tone: "success",
    shifts: [
      { time: "7am – 3pm", role: "Porter", tone: "success" },
      { time: "7am – 3pm", role: "Porter", tone: "success" },
      off,
      { time: "7am – 3pm", role: "Porter", tone: "success" },
      { time: "Open shift", role: "Porter", tone: "open", flag: "open" },
      { time: "7am – 3pm", role: "Porter", tone: "success" },
      off,
    ],
  },
];

const toneStyles: Record<string, string> = {
  info: "bg-info-soft/60 text-foreground border-info/20",
  warning: "bg-warning-soft/60 text-foreground border-warning/20",
  danger: "bg-danger-soft/60 text-foreground border-danger/20",
  purple: "bg-accent-purple-soft/60 text-foreground border-accent-purple/20",
  success: "bg-success-soft/60 text-foreground border-success/20",
  open: "bg-transparent text-muted-foreground border-dashed border-warning/60",
  off: "bg-transparent text-muted-foreground border-transparent",
};

function ShiftCell({ s }: { s: Shift }) {
  if (s.flag === "off")
    return (
      <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
        — Day off
      </div>
    );
  if (s.flag === "open") {
    return (
      <div
        className={`h-16 rounded-lg border-2 ${toneStyles.open} flex flex-col items-center justify-center text-xs`}
      >
        <div className="font-medium">Open shift</div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {s.role} <Plus className="h-3 w-3" />
        </div>
      </div>
    );
  }
  return (
    <div
      className={`h-16 rounded-lg border ${toneStyles[s.tone]} px-2.5 py-1.5 flex flex-col justify-between relative`}
    >
      <div className="text-xs font-semibold">{s.time}</div>
      <div className="text-[11px] text-muted-foreground">{s.role}</div>
      {s.flag === "conflict" && (
        <AlertTriangle className="h-3.5 w-3.5 text-warning absolute top-1.5 right-1.5" />
      )}
    </div>
  );
}

function RotaPage() {
  return (
    <AppShell>
      <PageHeader
        title="Rota"
        subtitle="Plan shifts, balance coverage and deliver great service."
        actions={
          <>
            <FilterButton label="Week" />
            <FilterButton label="All departments" />
            <FilterButton label="View by: Employee" />
            <ActionButton variant="outline" size="sm">
              Draft
            </ActionButton>
            <ActionButton variant="outline" size="sm">
              Review
            </ActionButton>
            <ActionButton icon={Send} size="sm">
              Publish Rota
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-9 p-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-2 pb-3 border-b border-border">
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="rounded-md bg-warning-soft text-warning px-1.5 py-0.5 font-bold">
                2
              </span>{" "}
              Conflicts
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="rounded-md bg-info-soft text-info px-1.5 py-0.5 font-bold">3</span>{" "}
              Open shifts
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <span className="rounded-md bg-accent-purple-soft text-accent-purple px-1.5 py-0.5 font-bold">
                1
              </span>{" "}
              Leave
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> Auto-fill
              </button>
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Templates
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <table className="w-full mt-3 border-separate border-spacing-y-2 min-w-[900px]">
              <thead>
                <tr className="text-left">
                  <th className="w-56 px-2">
                    <div className="text-sm font-semibold">
                      Staff <span className="text-muted-foreground font-normal">(24)</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        className="bg-transparent text-xs outline-none w-full"
                        placeholder="Search staff..."
                      />
                    </div>
                  </th>
                  {days.map((d) => (
                    <th key={d.d} className="px-1 align-top">
                      <div className="text-xs font-semibold">{d.d}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">⏱ {d.h}</div>
                      <div
                        className={`text-[11px] mt-0.5 ${d.tone === "danger" ? "text-danger" : d.tone === "warning" ? "text-warning" : "text-muted-foreground"}`}
                      >
                        ⊘ {d.c}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.name}>
                    <td className="px-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://i.pravatar.cc/64?img=${s.img}`}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {s.role} · {s.hrs}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Contracted</div>
                        </div>
                      </div>
                    </td>
                    {s.shifts.map((sh, i) => (
                      <td key={i} className="px-1">
                        <ShiftCell s={sh} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-2 pt-2">
                    <button className="w-full rounded-lg border border-dashed border-border py-2 text-xs flex items-center justify-center gap-1 text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" /> Add staff
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-2 pt-3 mt-1 border-t border-border flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
            <span>Coverage target: 100%</span>
            <span>Breaks: 30 mins unpaid break for shifts over 6 hours ⓘ</span>
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1">— Break</span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" /> Conflict
              </span>
              <span className="flex items-center gap-1">▢ Open shift</span>
              <span>— Day off</span>
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Labour summary</div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold">802h</div>
                <div className="text-xs text-muted-foreground">Total scheduled</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">98%</div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Target: 100% · 820h</div>
            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-[98%] bg-brand" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Budget: 820h</div>
            <a className="mt-4 block text-xs font-semibold text-brand">View full analysis →</a>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Alerts</span>
              <span className="text-xs text-muted-foreground">(6)</span>
            </div>
            {[
              { t: "3 Open shifts", s: "Require staff", icon: AlertTriangle, tone: "warning" },
              { t: "2 Conflicts", s: "Need attention", icon: CircleAlert, tone: "danger" },
              { t: "1 Overtime risk", s: "Exceeds 40h", icon: AlertTriangle, tone: "warning" },
            ].map((a) => (
              <div
                key={a.t}
                className="flex items-center gap-3 py-2 border-t first:border-t-0 border-border"
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${a.tone === "danger" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}
                >
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.t}</div>
                  <div className="text-xs text-muted-foreground">{a.s}</div>
                </div>
                <span className="text-muted-foreground">›</span>
              </div>
            ))}
            <a className="mt-3 block text-xs font-semibold text-brand">View all alerts →</a>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Publish readiness</div>
            {[
              ["Shifts assigned", "24 / 27"],
              ["Coverage target", "98%"],
              ["Conflicts resolved", "2 / 2"],
              ["Budget check", "Within budget"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="text-success">✓</span>
                  {k}
                </span>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
            <button className="mt-4 w-full rounded-xl bg-brand text-brand-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
              <Plane className="h-4 w-4" /> Ready to publish
            </button>
            <button className="mt-2 w-full rounded-xl border border-border py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              <Share2 className="h-4 w-4" /> Share draft
            </button>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold mb-3">Legend</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Management", "info"],
                ["Kitchen", "warning"],
                ["Bar", "danger"],
                ["Front of House", "info"],
                ["Housekeeping", "danger"],
                ["Porter", "success"],
              ].map(([t, tone]) => (
                <div key={t} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full bg-${tone}`}
                    style={{ background: `var(--${tone})` }}
                  />
                  {t}
                </div>
              ))}
              <span className="text-xs text-muted-foreground">+2 more</span>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
