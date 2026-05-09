import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  FilterButton,
  ActionButton,
  DrawerShell,
  ConfirmDialog,
  FormSection,
  FormRow,
  DetailRow,
} from "@/components/dl";
import {
  Calendar,
  ChevronDown,
  Filter,
  Download,
  PoundSterling,
  Percent,
  Users,
  Clock,
  Shield,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Docklist" }] }),
  component: ReportsPage,
});

const kpis = [
  {
    l: "Labour Cost",
    v: "£18,420",
    d: "4.3%",
    up: false,
    vs: "vs last week",
    icon: PoundSterling,
    tone: "info",
  },
  {
    l: "Labour %",
    v: "28.6%",
    d: "1.8pp",
    up: true,
    vs: "vs target",
    icon: Percent,
    tone: "warning",
  },
  {
    l: "Absence Rate",
    v: "4.2%",
    d: "0.6pp",
    up: false,
    vs: "vs last week",
    icon: Users,
    tone: "purple",
  },
  {
    l: "Overtime",
    v: "18.7 hrs",
    d: "2.1 hrs",
    up: true,
    vs: "vs last week",
    icon: Clock,
    tone: "danger",
  },
  {
    l: "Rota Compliance",
    v: "92%",
    d: "3pp",
    up: true,
    vs: "vs last week",
    icon: Shield,
    tone: "success",
  },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  purple: "bg-accent-purple-soft text-accent-purple",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

function ReportsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Reports"
        subtitle="Understand your labour performance and make better decisions."
        actions={
          <>
            <FilterButton icon={Calendar} label="12 – 18 May 2025" />
            <FilterButton icon={Filter} label="Filters" showCaret={false} />
            <FilterButton icon={Download} label="Export" showCaret={false} />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        {kpis.map((k) => (
          <Card key={k.l} className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[k.tone]}`}
              >
                <k.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium">{k.l}</div>
            </div>
            <div className="mt-3 text-3xl font-bold">{k.v}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {k.vs}{" "}
              <span className={`ml-1 font-semibold ${k.up ? "text-danger" : "text-success"}`}>
                {k.up ? "↑" : "↓"} {k.d}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-8 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              LABOUR % VS SALES ⓘ
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
              <button className="px-3 py-1 rounded-md bg-muted">Day</button>
              <button className="px-3 py-1 rounded-md">Week</button>
              <button className="px-3 py-1 rounded-md">Month</button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs mb-3">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-brand inline-block rounded" /> Labour %
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-4 inline-block rounded"
                style={{
                  background:
                    "repeating-linear-gradient(to right, var(--muted-foreground) 0 2px, transparent 2px 4px)",
                }}
              />{" "}
              Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-accent-purple inline-block rounded" /> Sales (£)
            </span>
          </div>

          <svg viewBox="0 0 600 240" className="w-full h-72">
            {/* grid */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={i}
                x1="40"
                x2="580"
                y1={20 + i * 40}
                y2={20 + i * 40}
                stroke="oklch(0.94 0.01 240)"
              />
            ))}
            {/* labour line */}
            <polyline
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2.5"
              points="80,150 160,140 240,160 320,130 400,90 480,80 560,110"
            />
            {/* target dashed */}
            <polyline
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              points="80,135 160,135 240,135 320,135 400,135 480,135 560,135"
            />
            {/* sales line purple */}
            <polyline
              fill="none"
              stroke="var(--accent-purple)"
              strokeWidth="2.5"
              points="80,170 160,165 240,140 320,110 400,60 480,75 560,85"
            />
            {/* dots */}
            {[
              [80, 150],
              [160, 140],
              [240, 160],
              [320, 130],
              [400, 90],
              [480, 80],
              [560, 110],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="var(--brand)" />
            ))}
            {[
              [80, 170],
              [160, 165],
              [240, 140],
              [320, 110],
              [400, 60],
              [480, 75],
              [560, 85],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="var(--accent-purple)" />
            ))}
            {/* y-axis labels */}
            {["40%", "35%", "30%", "25%", "20%", "15%"].map((t, i) => (
              <text key={t} x="10" y={25 + i * 40} fontSize="10" fill="var(--muted-foreground)">
                {t}
              </text>
            ))}
            {["£25K", "£20K", "£15K", "£10K", "£5K", "£0"].map((t, i) => (
              <text key={t} x="585" y={25 + i * 40} fontSize="10" fill="var(--muted-foreground)">
                {t}
              </text>
            ))}
          </svg>
          <div className="flex justify-between text-[11px] text-muted-foreground px-10">
            {["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs">
            <TrendingUp className="h-4 w-4 text-brand" />
            <span>
              Labour % averaged 28.6% this week, 1.8pp above target. Weekends were the main driver.
            </span>
            <a className="ml-auto text-brand font-semibold">View full trend →</a>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-warning" />
            <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              INSIGHTS
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                t: "Labour ran 1.8pp above target on weekends",
                s: "Weekend labour % was 31.2% vs a target of 29.4%.",
                a: "See weekend breakdown",
                icon: TrendingUp,
                tone: "warning",
              },
              {
                t: "2 teams have repeated late clock-ins",
                s: "Kitchen and Bar teams had the most late starts.",
                a: "View time approval report",
                icon: Users,
                tone: "danger",
              },
              {
                t: "Overtime increased by 2.1 hrs vs last week",
                s: "Mostly driven by Friday and Saturday shifts.",
                a: "Review overtime",
                icon: Calendar,
                tone: "info",
              },
              {
                t: "Rota compliance improved to 92%",
                s: "Great work! Keep an eye on next week's gaps.",
                a: "Review rota compliance",
                icon: CheckCircle2,
                tone: "success",
              },
            ].map((ins) => (
              <div key={ins.t} className="flex gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${toneBg[ins.tone]}`}
                >
                  <ins.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{ins.t}</div>
                  <div className="text-xs text-muted-foreground">{ins.s}</div>
                  <a className="text-xs font-semibold text-brand">{ins.a} →</a>
                </div>
              </div>
            ))}
          </div>
          <a className="mt-3 block text-xs font-semibold text-brand">View all insights →</a>
        </Card>

        {/* Bottom row */}
        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">
            TIME APPROVAL TREND
          </div>
          <div className="flex items-center gap-3 text-xs mb-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-brand" /> Approved on time
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-danger" /> Approved late
            </span>
          </div>
          <svg viewBox="0 0 280 140" className="w-full h-40">
            {["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"].map((d, i) => (
              <g key={d} transform={`translate(${20 + i * 36}, 0)`}>
                <rect
                  x="0"
                  y={30 + Math.random() * 10}
                  width="20"
                  height={70 - Math.random() * 10}
                  fill="var(--brand)"
                  rx="2"
                />
                <rect
                  x="0"
                  y={20 + Math.random() * 8}
                  width="20"
                  height="10"
                  fill="var(--danger)"
                  rx="2"
                />
                <text
                  x="10"
                  y="125"
                  fontSize="8"
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                >
                  {d}
                </text>
              </g>
            ))}
            {["100%", "75%", "50%", "25%", "0%"].map((t, i) => (
              <text key={t} x="0" y={20 + i * 25} fontSize="8" fill="var(--muted-foreground)">
                {t}
              </text>
            ))}
          </svg>
          <div className="text-xs text-muted-foreground mt-2">
            78% of timesheets were approved on time this week.
          </div>
          <a className="mt-2 block text-xs font-semibold text-brand">View time approval report →</a>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground mb-3">
            ABSENCE BREAKDOWN ⓘ
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--accent-purple)"
                  strokeWidth="6"
                  strokeDasharray="54 88"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="6"
                  strokeDasharray="19 88"
                  strokeDashoffset="-54"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="var(--warning)"
                  strokeWidth="6"
                  strokeDasharray="7 88"
                  strokeDashoffset="-73"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="oklch(0.85 0.02 240)"
                  strokeWidth="6"
                  strokeDasharray="8 88"
                  strokeDashoffset="-80"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold">36</div>
                <div className="text-[10px] text-muted-foreground">Total hours</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs flex-1">
              {[
                ["Sickness", "22h (61%)", "purple"],
                ["Annual Leave", "8h (22%)", "success"],
                ["Unpaid Leave", "3h (8%)", "warning"],
                ["Other", "3h (8%)", "muted"],
              ].map(([n, v, t]) => (
                <div key={n} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: t === "muted" ? "oklch(0.85 0.02 240)" : `var(--${t})` }}
                  />
                  <span className="flex-1">{n}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            Absence rate was 4.2%, down 0.6pp vs last week.
          </div>
          <a className="mt-2 block text-xs font-semibold text-brand">View absence report →</a>
        </Card>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
              LABOUR % BY DEPARTMENT ⓘ
            </div>
            <span className="text-[11px] text-muted-foreground">vs target (pp)</span>
          </div>
          {[
            ["Front of House", 80, "+0.9pp", "success"],
            ["Kitchen", 92, "+2.6pp", "danger"],
            ["Housekeeping", 65, "-1.4pp", "success"],
            ["Bar", 88, "+1.2pp", "danger"],
          ].map(([n, w, d, tone]) => (
            <div key={n as string} className="py-2.5">
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{n}</span>
                <span className="font-semibold">
                  {(w as number) / 3 + 5}.{(w as number) % 10}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div style={{ width: `${(w as number) - 10}%`, background: "var(--brand)" }} />
                <div style={{ width: "10%", background: "var(--brand)", opacity: 0.4 }} />
              </div>
              <div
                className={`text-[11px] mt-1 text-right ${tone === "danger" ? "text-danger" : "text-success"}`}
              >
                {d}
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground mt-2">
            Kitchen and Bar are driving labour % over target.
          </div>
          <a className="mt-2 block text-xs font-semibold text-brand">View department report →</a>
        </Card>
      </div>
    </AppShell>
  );
}
