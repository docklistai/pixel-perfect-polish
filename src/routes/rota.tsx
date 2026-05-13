import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  ActionButton,
  IconButton,
  FilterButton,
  DrawerShell,
  ConfirmDialog,
  DialogShell,
  FormSection,
  FormRow,
  DetailRow,
  StatusBadge,
  SearchField,
} from "@/components/dl";
import {
  Filter,
  SlidersHorizontal,
  AlertTriangle,
  CircleAlert,
  Download,
  Send,
  Share2,
  Plus,
  MoreHorizontal,
  Copy,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  CalendarPlus,
} from "lucide-react";

export const Route = createFileRoute("/rota")({
  head: () => ({ meta: [{ title: "Rota — Docklist" }] }),
  component: RotaPage,
});

const baseDayStats = [
  { h: "112h", c: "94%", tone: "muted" },
  { h: "128h", c: "100%", tone: "muted" },
  { h: "120h", c: "92%", tone: "muted" },
  { h: "134h", c: "103%", tone: "warning" },
  { h: "142h", c: "109%", tone: "warning" },
  { h: "156h", c: "118%", tone: "danger" },
  { h: "110h", c: "89%", tone: "warning" },
];

function getWeekDayLabels(offset: number): string[] {
  const base = new Date(2025, 4, 12);
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() + offset * 7);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return `${dayNames[i]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
  });
}

function getWeekLabel(offset: number): string {
  const base = new Date(2025, 4, 12);
  const start = new Date(base);
  start.setDate(base.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${monthNames[start.getMonth()]}`;
  }
  return `${start.getDate()} ${monthNames[start.getMonth()]} – ${end.getDate()} ${monthNames[end.getMonth()]}`;
}

type Shift = { time: string; role: string; tone: string; flag?: "conflict" | "open" | "off" };
type ShiftDetail = Shift & { staff: string; day: string };
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
  info: "bg-info-soft/70 text-foreground border-info/20",
  warning: "bg-warning-soft/70 text-foreground border-warning/20",
  danger: "bg-danger-soft/70 text-foreground border-danger/20",
  purple: "bg-accent-purple-soft/70 text-foreground border-accent-purple/20",
  success: "bg-success-soft/70 text-foreground border-success/20",
  open: "bg-warning-soft/70 text-warning-700 border-dashed border-warning/60",
  off: "bg-transparent text-muted-foreground border-transparent",
};

const roleLegend = [
  { label: "Management", tone: "info" },
  { label: "Kitchen", tone: "warning" },
  { label: "Bar", tone: "warning" },
  { label: "Service", tone: "purple" },
  { label: "Housekeeping", tone: "danger" },
  { label: "Porter", tone: "success" },
];

function ShiftCell({ s, onOpen, ariaLabel }: { s: Shift; onOpen?: () => void; ariaLabel: string }) {
  if (s.flag === "off")
    return (
      <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
        <span aria-hidden>— Day off</span>
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  if (s.flag === "open") {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className={`flex h-16 w-full flex-col justify-center rounded-[10px] border-2 px-2.5 text-xs transition hover:bg-warning-soft/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles.open}`}
      >
        <div className="font-semibold text-warning-700">Open shift</div>
        <div className="flex items-center gap-1 text-[11px] text-warning-700/80">
          {s.role} <Plus className="h-3 w-3" />
        </div>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={`relative flex h-16 w-full flex-col justify-between rounded-[10px] border px-2.5 py-1.5 text-left transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${toneStyles[s.tone]}`}
    >
      <div className="text-xs font-semibold tracking-tight">{s.time}</div>
      <div className="text-[11px] text-muted-foreground">{s.role}</div>
      {s.flag === "conflict" && (
        <AlertTriangle className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-warning" />
      )}
    </button>
  );
}

function RotaPage() {
  const [addOpen, setAddOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [conflictOpen, setConflictOpen] = React.useState(false);
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [published, setPublished] = React.useState(false);
  const [shiftDetail, setShiftDetail] = React.useState<ShiftDetail | null>(null);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [unavailableFeature, setUnavailableFeature] = React.useState<string | null>(null);

  const weekLabel = getWeekLabel(weekOffset);
  const days = getWeekDayLabels(weekOffset).map((d, i) => ({ d, ...baseDayStats[i] }));

  const scheduleTitleId = "rota-schedule-title";
  const scheduleDescId = "rota-schedule-desc";
  const openShiftCount = staff.reduce(
    (count, row) => count + row.shifts.filter((shift) => shift.flag === "open").length,
    0,
  );
  const conflictCount = staff.reduce(
    (count, row) => count + row.shifts.filter((shift) => shift.flag === "conflict").length,
    0,
  );
  const roleCoverage = staff
    .map((row) => {
      const filled = row.shifts.filter(
        (shift) => shift.flag !== "off" && shift.flag !== "open",
      ).length;
      const total = row.shifts.length;
      const pct = Math.round((filled / total) * 100);
      return { label: row.role, value: `${filled} / ${total}`, pct, tone: row.tone };
    })
    .sort((a, b) => a.pct - b.pct);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">Rota</h1>
            <StatusBadge tone={published ? "success" : "warning"} dot>
              {published ? "Published" : "Draft"} ·{" "}
              {published ? "staff can see this snapshot" : "edited 12 min ago"}
            </StatusBadge>
          </div>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            Week of {weekLabel} · Harbour View Hotel
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <IconButton
            icon={ChevronLeft}
            label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
          />
          <FilterButton
            icon={Calendar}
            label={weekLabel}
            onClick={() => setUnavailableFeature("Week picker")}
          />
          <IconButton
            icon={ChevronRight}
            label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
          />
          <FilterButton
            label="All departments"
            onClick={() => setUnavailableFeature("Department filter")}
          />
          <FilterButton
            label="View by: Employee"
            onClick={() => setUnavailableFeature("View mode")}
          />
          <ActionButton icon={CalendarPlus} onClick={() => setGenerateOpen(true)}>
            Generate rota
          </ActionButton>
          <IconButton
            icon={MoreHorizontal}
            label="More actions"
            onClick={() => setUnavailableFeature("More actions")}
          />
        </div>
      </div>

      <div
        className={`mb-4 rounded-[18px] border px-5 py-4 shadow-[var(--shadow-card)] ${
          published ? "border-success/20 bg-success-soft/30" : "border-warning/20 bg-warning-soft"
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${
                published ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
              }`}
            >
              <CircleAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {published
                  ? "Published rota · staff can see this snapshot"
                  : "Draft rota · not yet shared with staff"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {published
                  ? "Latest changes are visible to staff. Use republish to push updates."
                  : `${openShiftCount} open shifts · ${conflictCount} conflicts · 98% coverage. Resolve the warnings to publish.`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <ActionButton variant="secondary" size="sm" icon={Share2} disabled>
              {published ? "Share published link" : "Share draft link"}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" icon={Download} disabled>
              Export PDF
            </ActionButton>
            <ActionButton size="sm" icon={Send} onClick={() => setPublishOpen(true)}>
              {published ? "Republish to staff" : "Publish to staff"}
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
            <ActionButton
              variant="secondary"
              size="sm"
              icon={Filter}
              onClick={() => setUnavailableFeature("Filters")}
            >
              Filters
            </ActionButton>
            <StatusBadge tone="danger" dot>
              {conflictCount} Conflicts
            </StatusBadge>
            <StatusBadge tone="warning" dot>
              {openShiftCount} Open shifts
            </StatusBadge>
            <StatusBadge tone="success" dot>
              98% Coverage
            </StatusBadge>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <ActionButton
                variant="secondary"
                size="sm"
                icon={SlidersHorizontal}
                onClick={() => setUnavailableFeature("Templates")}
              >
                Templates
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Copy}
                onClick={() => setUnavailableFeature("Copy last week")}
              >
                Copy last week
              </ActionButton>
              <ActionButton
                variant="outline"
                size="sm"
                icon={CalendarPlus}
                onClick={() => setGenerateOpen(true)}
              >
                Generate rota
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Plus}
                onClick={() => setAddOpen(true)}
              >
                Add shift
              </ActionButton>
              <ActionButton variant="secondary" size="sm" onClick={() => setConflictOpen(true)}>
                View conflicts
              </ActionButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <section
              role="region"
              aria-labelledby={scheduleTitleId}
              aria-describedby={scheduleDescId}
              className="min-w-[1100px]"
              style={{
                display: "grid",
                gridTemplateColumns: "240px repeat(7, minmax(120px, 1fr))",
              }}
            >
              <h2 id={scheduleTitleId} className="sr-only">
                Weekly rota matrix
              </h2>
              <p id={scheduleDescId} className="sr-only">
                Interactive schedule grid for the week of {weekLabel}. Each shift tile includes the
                staff member, day, role, and status so screen readers can understand open shifts,
                conflicts, and days off.
              </p>
              <div className="border-b border-border px-4 py-4">
                <div className="text-sm font-semibold">
                  Staff <span className="font-normal text-muted-foreground">({staff.length})</span>
                </div>
                <div className="mt-2">
                  <SearchField placeholder="Search staff..." aria-label="Search staff in rota" />
                </div>
              </div>
              {days.map((d) => (
                <div key={d.d} className="border-b border-l border-border px-3 py-4">
                  <div className="text-sm font-semibold tracking-tight">{d.d}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    <span>{d.h}</span>
                  </div>
                  <div
                    className={`mt-1 flex items-center gap-1.5 text-xs ${
                      d.tone === "danger"
                        ? "text-danger"
                        : d.tone === "warning"
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    <Target className="h-3 w-3" aria-hidden />
                    <span>{d.c}</span>
                  </div>
                </div>
              ))}

              {staff.map((s) => (
                <React.Fragment key={s.name}>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                    <img
                      src={`https://i.pravatar.cc/64?img=${s.img}`}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {s.role} · {s.hrs}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Contracted</div>
                    </div>
                  </div>
                  {s.shifts.map((sh, i) => (
                    <div key={i} className="border-b border-l border-border px-2 py-2">
                      <ShiftCell
                        s={sh}
                        onOpen={() => setShiftDetail({ ...sh, staff: s.name, day: days[i].d })}
                        ariaLabel={`${s.name}, ${days[i].d}: ${sh.time === "—" ? "Day off" : `${sh.time}, ${sh.role}`}${sh.flag === "open" ? ", open shift" : sh.flag === "conflict" ? ", conflict" : ""}`}
                      />
                    </div>
                  ))}
                </React.Fragment>
              ))}

              <div className="border-b border-border px-4 py-3.5">
                <ActionButton
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setUnavailableFeature("Add staff")}
                >
                  Add staff
                </ActionButton>
              </div>
              {days.map((d) => (
                <div
                  key={`footer-${d.d}`}
                  className="border-b border-l border-border px-3 py-4 text-xs text-muted-foreground"
                >
                  {d.h}
                </div>
              ))}
            </section>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{staff.length} staff members</span>
            </span>
            <span>Coverage target: 100%</span>
            <span>
              Breaks: 30 mins unpaid break for shifts over 6 hours{" "}
              <CircleAlert className="inline-block h-3 w-3 align-[-1px]" />
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">— Break</span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" /> Conflict
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-warning" />
                Open shift
              </span>
              <span>— Day off</span>
            </div>
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Labour summary</div>
              <StatusBadge tone="muted">This week</StatusBadge>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="oklch(0.92 0.01 240)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="226"
                    strokeDashoffset="5"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-[24px] font-semibold tracking-tight">802h</div>
                  <div className="text-[10px] text-muted-foreground">Coverage 98%</div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total scheduled</div>
                  <div className="text-[18px] font-semibold">802h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-[18px] font-semibold">820h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Budget</div>
                  <div className="text-[18px] font-semibold text-brand">On track</div>
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[98%] bg-brand" />
            </div>
            <ActionButton
              variant="ghost"
              size="sm"
              className="mt-3 px-0 text-xs font-semibold text-brand"
              onClick={() => setUnavailableFeature("Labour analysis")}
            >
              View full analysis
            </ActionButton>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Alerts</div>
              <span className="text-xs text-muted-foreground">(3)</span>
            </div>
            <div className="space-y-3">
              {[
                {
                  t: "3 Open shifts",
                  s: "Require staff",
                  icon: AlertTriangle,
                  tone: "warning",
                  action: () => setAddOpen(true),
                },
                {
                  t: "2 Conflicts",
                  s: "Need attention",
                  icon: CircleAlert,
                  tone: "danger",
                  action: () => setConflictOpen(true),
                },
                {
                  t: "1 Working time alert",
                  s: "Exceeds 40h",
                  icon: AlertTriangle,
                  tone: "warning",
                  action: () => setUnavailableFeature("Working time details"),
                },
              ].map((a) => (
                <button
                  key={a.t}
                  type="button"
                  onClick={a.action}
                  className="flex w-full items-center gap-3 rounded-[12px] border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${
                      a.tone === "danger"
                        ? "bg-danger-soft text-danger"
                        : "bg-warning-soft text-warning"
                    }`}
                  >
                    <a.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.s}</div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </button>
              ))}
            </div>
            <ActionButton
              variant="ghost"
              size="sm"
              className="mt-3 px-0 text-xs font-semibold text-brand"
              onClick={() => setConflictOpen(true)}
            >
              View all alerts
            </ActionButton>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Publish readiness</div>
              <StatusBadge tone={published ? "success" : "warning"}>
                {published ? "Published" : "Draft"}
              </StatusBadge>
            </div>
            <div className="space-y-2">
              {[
                { k: "Shifts assigned", v: "24 / 27", ok: true },
                { k: "Coverage target", v: "98%", ok: true },
                {
                  k: "Conflicts resolved",
                  v: `${conflictCount === 0 ? "All" : `0 / ${conflictCount}`}`,
                  ok: conflictCount === 0,
                },
                { k: "Budget check", v: "On track", ok: true },
              ].map(({ k, v, ok }) => (
                <div key={k} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-foreground">
                    <span className={ok ? "text-success" : "text-danger"}>{ok ? "✓" : "✗"}</span>
                    {k}
                  </span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
            <ActionButton
              className="mt-4 w-full"
              icon={Send}
              onClick={() => !published && setPublishOpen(true)}
              disabled={published}
            >
              {published ? "Published" : "Publish to staff"}
            </ActionButton>
            <ActionButton className="mt-2 w-full" variant="secondary" icon={Share2} disabled>
              Share draft
            </ActionButton>
            <ActionButton className="mt-2 w-full" variant="ghost" icon={Download} disabled>
              Export PDF
            </ActionButton>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Role coverage</div>
              <span className="text-xs text-muted-foreground">This week</span>
            </div>
            <div className="space-y-3">
              {roleCoverage.slice(0, 5).map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">{row.label}</span>
                    <span className="text-muted-foreground">{row.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        row.pct >= 85 ? "bg-success" : row.pct >= 70 ? "bg-warning" : "bg-danger"
                      }`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 text-sm font-semibold">Legend</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {roleLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      item.tone === "warning"
                        ? "bg-warning"
                        : item.tone === "danger"
                          ? "bg-danger"
                          : item.tone === "purple"
                            ? "bg-accent-purple"
                            : item.tone === "success"
                              ? "bg-success"
                              : "bg-info"
                    }`}
                  />
                  {item.label}
                </div>
              ))}
              <span className="text-xs text-muted-foreground">+2 more</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Add shift drawer */}
      <DrawerShell
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add shift"
        description="Create a new shift on the rota."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setAddOpen(false)}>Add to rota</ActionButton>
          </>
        }
      >
        <FormSection title="Shift">
          <FormRow label="Day" required>
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              {days.map((d) => (
                <option key={d.d}>{d.d}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Role" required>
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option>Front of House</option>
              <option>Bar</option>
              <option>Kitchen</option>
              <option>Housekeeping</option>
            </select>
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Start" required>
              <input
                type="time"
                defaultValue="17:00"
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              />
            </FormRow>
            <FormRow label="End" required>
              <input
                type="time"
                defaultValue="23:00"
                className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
              />
            </FormRow>
          </div>
          <FormRow label="Assign to" hint="Leave blank to post as an open shift.">
            <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">Post as open shift</option>
              {staff.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} · {s.role}
                </option>
              ))}
            </select>
          </FormRow>
        </FormSection>
      </DrawerShell>

      {/* Conflict details drawer */}
      <DrawerShell
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="Rota conflicts"
        description="2 conflicts detected this week."
        meta={<StatusBadge tone="warning">2 issues</StatusBadge>}
        footer={<ActionButton onClick={() => setConflictOpen(false)}>Close</ActionButton>}
      >
        <FormSection title="Issues">
          <dl className="divide-y divide-border">
            <DetailRow label="Sophie Carter" value="Double-booked Sat 17 May · 12:00–18:00" />
            <DetailRow label="Daniel Mitchell" value="Below 11h rest break (Fri → Sat)" />
          </dl>
        </FormSection>
        <p className="text-[11px] text-muted-foreground">
          Resolve conflicts before publishing. UK working-time rules applied.
        </p>
      </DrawerShell>

      {/* Publish rota dialog */}
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`Publish rota for w/c ${weekLabel}?`}
        description="24 staff will be notified via the staff portal."
        confirmLabel="Publish"
        cancelLabel="Not yet"
        onConfirm={() => {
          setPublished(true);
          setPublishOpen(false);
        }}
      />

      {/* Generate rota dialog */}
      <DialogShell
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="Generate rota"
        description={`Auto-fill the week of ${weekLabel} based on staff availability and role requirements.`}
        size="sm"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setGenerateOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton icon={CalendarPlus} onClick={() => setGenerateOpen(false)}>
              Generate
            </ActionButton>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          AI-assisted rota generation is coming soon. It will use contracted hours, availability,
          and role requirements to suggest a full week.
        </p>
      </DialogShell>

      {/* Unavailable feature dialog */}
      <DialogShell
        open={!!unavailableFeature}
        onOpenChange={(o) => !o && setUnavailableFeature(null)}
        title={unavailableFeature ?? ""}
        description="This feature is not available yet."
        size="sm"
        footer={<ActionButton onClick={() => setUnavailableFeature(null)}>Got it</ActionButton>}
      >
        <p className="text-sm text-muted-foreground">
          {unavailableFeature} will be available in an upcoming release.
        </p>
      </DialogShell>

      {/* Shift detail drawer */}
      <DrawerShell
        open={!!shiftDetail}
        onOpenChange={(o) => !o && setShiftDetail(null)}
        title={shiftDetail?.staff ?? "Shift"}
        description={shiftDetail ? `${shiftDetail.day} · ${shiftDetail.role}` : undefined}
        meta={
          shiftDetail?.flag === "conflict" ? (
            <StatusBadge tone="warning">Conflict</StatusBadge>
          ) : shiftDetail?.flag === "open" ? (
            <StatusBadge tone="info">Open shift</StatusBadge>
          ) : (
            <StatusBadge tone="success">Scheduled</StatusBadge>
          )
        }
        footer={<ActionButton onClick={() => setShiftDetail(null)}>Close</ActionButton>}
      >
        <FormSection title="Shift details">
          <dl className="divide-y divide-border">
            <DetailRow label="Assigned to" value={shiftDetail?.staff ?? "—"} />
            <DetailRow label="Role" value={shiftDetail?.role ?? "—"} />
            <DetailRow label="Day" value={shiftDetail?.day ?? "—"} />
            <DetailRow label="Time" value={shiftDetail?.time ?? "—"} />
            <DetailRow
              label="Status"
              value={
                shiftDetail?.flag === "conflict"
                  ? "Conflict — needs review"
                  : shiftDetail?.flag === "open"
                    ? "Open — unassigned"
                    : "Scheduled"
              }
            />
          </dl>
        </FormSection>
      </DrawerShell>
    </AppShell>
  );
}
