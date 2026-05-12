import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  PlayCircle,
  Check,
  ShieldCheck,
  Sparkles,
  Clock3,
  Users,
  Calendar,
  MessageSquare,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  CircleCheck,
  Rocket,
  Mail,
  Linkedin,
  Twitter,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "DocklistAI — The rota, rebuilt for hospitality" },
      {
        name: "description",
        content:
          "Plan the week, check coverage, manage staff changes, and publish a rota your team can actually trust. Built for cafes, pubs, restaurants and hotels.",
      },
      { property: "og:title", content: "DocklistAI — The rota, rebuilt" },
      {
        property: "og:description",
        content:
          "Scheduling-first workspace for hospitality teams. Coverage, availability, leave, time and comms in one calm view.",
      },
    ],
  }),
  component: LandingPage,
});

/* -------------------- small primitives (page-local) -------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
      <Sparkles className="h-3 w-3" />
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
      {children}
    </div>
  );
}

function Logo() {
  return (
    <Link to="/landing" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
        <Waves className="h-4 w-4" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-foreground">
        Docklist<span className="text-brand">AI</span>
      </span>
    </Link>
  );
}

/* -------------------- nav -------------------- */

function Nav() {
  const links = [
    { href: "#how", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#resources", label: "Resources" },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------- hero -------------------- */

function HeroRotaMock() {
  const days = ["Mon 11", "Tue 12", "Wed 13", "Thu 14", "Fri 15", "Sat 16", "Sun 17"];
  const rows: { name: string; section?: string; cells: (string | "open" | "off")[] }[] = [
    {
      section: "Front of House",
      name: "Olivia M.",
      cells: ["09–17", "09–17", "09–18", "—", "09–17", "09–17", "off"],
    },
    { name: "Liam T.", cells: ["—", "10–19", "10–19", "10–19", "—", "10–21", "10–21"] },
    { name: "Chloe R.", cells: ["09–18", "—", "13–22", "12–23", "12–22", "—", "—"] },
    {
      section: "Kitchen",
      name: "James K.",
      cells: ["10–17", "10–17", "10–17", "—", "—", "10–17", "10–17"],
    },
    { name: "Sophie L.", cells: ["10–22", "10–22", "10–22", "—", "open", "10–22", "10–22"] },
    { name: "Alex P.", cells: ["10–22", "10–22", "—", "—", "—", "18–00", "—"] },
  ];
  const checks = [
    { label: "Uncovered shifts", value: "2 issues", tone: "danger" as const },
    { label: "Availability conflicts", value: "1 issue", tone: "warning" as const },
    { label: "Leave clashes", value: "0 issues", tone: "success" as const },
    { label: "Labour pressure", value: "Good", tone: "success" as const },
    { label: "Late changes", value: "2 since last publish", tone: "info" as const },
  ];
  const toneDot: Record<string, string> = {
    danger: "bg-danger",
    warning: "bg-warning",
    success: "bg-success",
    info: "bg-info",
  };

  return (
    <div className="relative">
      {/* glow */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-[40px] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 40%, oklch(0.85 0.08 195 / 0.45), transparent 70%)",
        }}
      />
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
        {/* mock topbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Waves className="h-3.5 w-3.5" />
            </span>
            <span className="text-[13px] font-semibold">DocklistAI</span>
            <span className="ml-3 text-[12px] text-muted-foreground">
              Week 12 · 11 – 17 May 2025
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Draft saved 2m ago
            </span>
            <button
              type="button"
              className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-brand-foreground"
            >
              Publish rota
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* sidebar mock */}
          <div className="col-span-3 hidden border-r border-border p-3 md:block">
            {[
              "Rota",
              "Team",
              "Availability",
              "Leave",
              "Time",
              "Comms",
              "Reports",
              "Settings",
            ].map((l, i) => (
              <div
                key={l}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] ${
                  i === 0
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-muted-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                {l}
              </div>
            ))}
          </div>

          {/* main grid + smart checks */}
          <div className="col-span-12 p-4 md:col-span-9">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { l: "Coverage", v: "98%", d: "+2% vs last week", tone: "success" },
                { l: "Labour cost", v: "£12,842", d: "−3.4% vs last", tone: "info" },
                { l: "Open shifts", v: "2", d: "3 less than last week", tone: "warning" },
                { l: "Overtime risk", v: "Low", d: "All good", tone: "success" },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-border bg-background/60 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {k.l}
                  </div>
                  <div className="mt-1 text-[18px] font-semibold tracking-tight">{k.v}</div>
                  <div className="text-[10px] text-muted-foreground">{k.d}</div>
                </div>
              ))}
            </div>

            {/* grid + checks */}
            <div className="mt-3 grid grid-cols-12 gap-3">
              <div className="col-span-12 overflow-hidden rounded-xl border border-border lg:col-span-8">
                <div className="grid grid-cols-8 bg-muted/60 text-[10px] font-medium text-muted-foreground">
                  <div className="px-2 py-2">Staff</div>
                  {days.map((d) => (
                    <div key={d} className="px-2 py-2 text-center">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-border">
                  {rows.map((r, idx) => (
                    <div key={idx}>
                      {r.section && (
                        <div className="bg-muted/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.section}
                        </div>
                      )}
                      <div className="grid grid-cols-8 items-center text-[11px]">
                        <div className="flex items-center gap-2 px-2 py-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[9px] font-semibold text-brand">
                            {r.name
                              .split(" ")
                              .map((s) => s[0])
                              .join("")}
                          </span>
                          <span className="truncate">{r.name}</span>
                        </div>
                        {r.cells.map((c, i) => (
                          <div key={i} className="px-1.5 py-1.5 text-center">
                            {c === "open" ? (
                              <span className="inline-block w-full rounded-md border border-danger/30 bg-danger-soft px-1 py-1 text-[10px] font-semibold text-danger">
                                OPEN
                              </span>
                            ) : c === "off" || c === "—" ? (
                              <span className="text-muted-foreground/60">—</span>
                            ) : (
                              <span className="inline-block w-full rounded-md bg-info-soft px-1 py-1 text-[10px] font-medium text-info">
                                {c}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold">Smart checks</div>
                  <div className="mt-2 space-y-2">
                    {checks.map((c) => (
                      <div
                        key={c.label}
                        className="flex items-start gap-2 rounded-lg border border-border/60 px-2.5 py-2"
                      >
                        <span className={`mt-1 h-2 w-2 rounded-full ${toneDot[c.tone]}`} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium">{c.label}</div>
                          <div className="text-[10px] text-muted-foreground">{c.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-brand/20 bg-brand-soft/60 p-3">
                  <div className="text-[11px] font-semibold text-brand">Looks good?</div>
                  <div className="text-[10px] text-muted-foreground">
                    Review and publish with confidence.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 10% 10%, oklch(0.95 0.05 195 / 0.7), transparent 60%), radial-gradient(50% 50% at 100% 0%, oklch(0.96 0.04 230 / 0.6), transparent 60%)",
        }}
      />
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-24">
        <div>
          <Eyebrow>Built for hospitality rota teams</Eyebrow>
          <h1 className="mt-5 text-balance text-[44px] font-semibold leading-[1.05] tracking-tight md:text-[56px]">
            The rota,
            <br />
            <span className="text-brand">rebuilt.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Plan the week, check coverage, manage staff changes, and publish a rota your team
            can actually trust. Scheduling first — admin second.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-[var(--shadow-card)] transition hover:opacity-95"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/40"
            >
              <PlayCircle className="h-4 w-4" /> See how it works
            </a>
          </div>
          <div className="mt-7 grid grid-cols-1 gap-3 text-[12px] text-muted-foreground sm:grid-cols-3">
            {[
              { icon: ShieldCheck, t: "No credit card required" },
              { icon: Users, t: "Built for hospitality teams" },
              { icon: Calendar, t: "Scheduling first, admin second" },
            ].map((b) => (
              <div key={b.t} className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-foreground/70">
                  <b.icon className="h-3.5 w-3.5" />
                </span>
                {b.t}
              </div>
            ))}
          </div>
        </div>

        <HeroRotaMock />
      </div>
    </section>
  );
}

/* -------------------- pressure / value bar -------------------- */

function ValueBar() {
  const items = [
    { icon: Clock3, t: "Save hours every week", s: "by reducing manual rota admin" },
    { icon: AlertTriangle, t: "Reduce last-minute", s: "surprises and staffing fire drills" },
    { icon: CircleCheck, t: "Give your team clear", s: "rotas they can rely on" },
    { icon: ShieldCheck, t: "Stay compliant with", s: "coverage, leave and labour rules" },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <SectionLabel>Built around real hospitality rota pressure</SectionLabel>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.t} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <i.icon className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[13px] font-semibold">{i.t}</div>
                <div className="text-[12px] text-muted-foreground">{i.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- how it works -------------------- */

function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Build the week",
      body:
        "Drag, copy, adjust and shape the rota around staff availability and business needs.",
    },
    {
      n: 2,
      title: "Check the pressure",
      body:
        "Spot gaps, clashes, leave conflicts and labour pressure before the rota goes live.",
    },
    {
      n: 3,
      title: "Publish with confidence",
      body:
        "Share a clear rota with your team and keep changes visible to everyone.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-6 py-20">
      <div className="text-center">
        <SectionLabel>How it works</SectionLabel>
        <h2 className="mt-3 text-balance text-[32px] font-semibold tracking-tight md:text-[40px]">
          From plan to publish in 3 simple steps
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.n}
            className="group relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-brand-foreground">
                {s.n}
              </span>
              <div className="text-[15px] font-semibold">{s.title}</div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{s.body}</p>
            <div className="mt-5 h-28 rounded-xl border border-dashed border-border/70 bg-muted/40 p-3">
              {s.n === 1 && (
                <div className="grid h-full grid-cols-5 gap-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded ${
                        [3, 6, 12, 14].includes(i) ? "bg-brand/70" : "bg-background"
                      } border border-border/60`}
                    />
                  ))}
                </div>
              )}
              {s.n === 2 && (
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-2 py-1.5 text-danger">
                    <AlertTriangle className="h-3 w-3" /> 2 open shifts
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-2 py-1.5 text-warning">
                    <AlertTriangle className="h-3 w-3" /> 1 availability clash
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info-soft px-2 py-1.5 text-info">
                    <BarChart3 className="h-3 w-3" /> Labour pressure: High
                  </div>
                </div>
              )}
              {s.n === 3 && (
                <div className="flex h-full items-center justify-center gap-3">
                  <div className="rounded-xl border border-border bg-background px-3 py-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-success">
                      <CircleCheck className="h-3.5 w-3.5" /> Your rota is published
                    </div>
                    <div className="mt-1 text-muted-foreground">Week 12 · 11 – 17 May</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- features -------------------- */

function Features() {
  const main = {
    title: "Rota Builder",
    body: "Powerful drag-and-drop rota planning built for hospitality.",
  };
  const items = [
    {
      icon: Calendar,
      t: "Availability",
      s: "See when your team can work.",
      tone: "brand",
    },
    {
      icon: ClipboardList,
      t: "Leave",
      s: "Track requests and avoid clashes.",
      tone: "success",
    },
    {
      icon: Users,
      t: "Staff",
      s: "Keep contracts, roles and details in one place.",
      tone: "info",
    },
    {
      icon: Clock3,
      t: "Time",
      s: "Clock in/out, breaks and timesheets.",
      tone: "warning",
    },
    {
      icon: MessageSquare,
      t: "Team Comms",
      s: "Share updates with your team.",
      tone: "purple",
    },
    {
      icon: ClipboardList,
      t: "Ops Log",
      s: "Daily notes and operational tasks.",
      tone: "info",
    },
    {
      icon: BarChart3,
      t: "Reports",
      s: "Labour, sales and performance insights.",
      tone: "brand",
    },
  ];
  const toneMap: Record<string, string> = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
    purple: "bg-accent-purple-soft text-accent-purple",
  };
  return (
    <section id="features" className="mx-auto max-w-[1200px] px-6 py-20">
      <div className="text-center">
        <SectionLabel>Everything in one place</SectionLabel>
        <h2 className="mt-3 text-balance text-[32px] font-semibold tracking-tight md:text-[40px]">
          Everything you need to run the rota week
        </h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                <Calendar className="h-4 w-4" />
              </span>
              <div className="text-[15px] font-semibold">{main.title}</div>
            </div>
            <p className="mt-2 text-[13px] text-muted-foreground">{main.body}</p>
            <div className="mt-5 rounded-xl border border-border bg-background p-3">
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {["Mon", "Tue", "Wed", "Thu"].map((d) => (
                  <div key={d} className="text-center text-muted-foreground">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded ${
                      [1, 4, 6].includes(i) ? "bg-brand/80" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2 py-1 text-[10px] font-semibold text-info">
                09:00 – 17:00
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {items.map((f) => (
            <div
              key={f.t}
              className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneMap[f.tone]}`}
                >
                  <f.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">{f.t}</div>
                  <div className="text-[12px] text-muted-foreground">{f.s}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- testimonials -------------------- */

function Testimonials() {
  const quotes = [
    {
      q: "The rota finally feels manageable. I can see the week before it becomes a problem.",
      a: "Cafe Manager",
    },
    {
      q: "Last-minute changes used to ruin my day. Now I fix it in minutes, not hours.",
      a: "Pub Manager",
    },
    {
      q: "Staff know what changed and why. Fewer questions, more time for service.",
      a: "Restaurant Manager",
    },
    {
      q: "It's built for hospitality, not an office. That makes all the difference.",
      a: "Hotel Manager",
    },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20">
      <div
        className="overflow-hidden rounded-3xl border border-border p-8 md:p-10"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.22 0.045 250) 0%, oklch(0.18 0.045 250) 100%)",
        }}
      >
        <SectionLabel>
          <span className="text-brand-soft/90">Trusted by hospitality managers</span>
        </SectionLabel>
        <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-background md:text-[34px]">
          Real managers. Real moments.
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quotes.map((q) => (
            <figure
              key={q.a}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-background/90 backdrop-blur"
            >
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
                    <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-3 text-[13px] leading-6">"{q.q}"</blockquote>
              <figcaption className="mt-3 text-[12px] text-background/60">— {q.a}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- pricing teaser -------------------- */

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "Free",
      blurb: "For small teams getting started.",
      features: ["Up to 10 staff", "Rota builder", "Availability & leave", "Email support"],
      cta: "Start free",
      highlighted: false,
    },
    {
      name: "Growth",
      price: "Coming soon",
      blurb: "For multi-site hospitality teams.",
      features: [
        "Unlimited staff",
        "Time & timesheets",
        "Reports & insights",
        "Team comms & ops log",
      ],
      cta: "Join the waitlist",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Talk to us",
      blurb: "For groups and hotels with custom needs.",
      features: ["Dedicated support", "Custom roles & SSO", "Onboarding & training", "SLA"],
      cta: "Contact sales",
      highlighted: false,
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-[1200px] px-6 py-20">
      <div className="text-center">
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="mt-3 text-balance text-[32px] font-semibold tracking-tight md:text-[40px]">
          Simple plans, built for hospitality
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[14px] text-muted-foreground">
          Start free while we get DocklistAI ready. Upgrade when your team grows.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-2xl border p-6 ${
              t.highlighted
                ? "border-brand/40 bg-card shadow-[var(--shadow-elevated)]"
                : "border-border bg-card shadow-[var(--shadow-card)]"
            }`}
          >
            {t.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-foreground">
                Most popular
              </span>
            )}
            <div className="text-[13px] font-semibold text-muted-foreground">{t.name}</div>
            <div className="mt-1 text-[28px] font-semibold tracking-tight">{t.price}</div>
            <p className="mt-1 text-[13px] text-muted-foreground">{t.blurb}</p>
            <ul className="mt-5 space-y-2 text-[13px]">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-brand" /> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                t.highlighted
                  ? "bg-brand text-brand-foreground hover:opacity-95"
                  : "border border-border bg-background hover:bg-muted/40"
              }`}
            >
              {t.cta} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------- CTA -------------------- */

function CTA() {
  return (
    <section id="resources" className="mx-auto max-w-[1200px] px-6 pb-20">
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-10 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Rocket className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-[24px] font-semibold tracking-tight md:text-[28px]">
              Ready for a calmer rota week?
            </h3>
            <p className="mt-1 max-w-xl text-[14px] text-muted-foreground">
              Start with scheduling, then bring staff, time, leave and daily operations into
              one clear workspace.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row lg:flex-col">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground transition hover:opacity-95"
            >
              Create your account
            </Link>
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-muted/40"
            >
              <PlayCircle className="h-4 w-4" /> See how it works
            </a>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-5 text-[12px] text-muted-foreground sm:grid-cols-3">
          {[
            "No credit card required",
            "Built for hospitality teams",
            "Scheduling first, admin second",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <CircleCheck className="h-3.5 w-3.5 text-brand" /> {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------- footer -------------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-12 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] text-muted-foreground">
            Scheduling workspace for hospitality teams. Made in Scotland · Bootstrapped.
          </p>
        </div>
        {[
          {
            h: "Product",
            l: ["How it works", "Features", "Pricing"],
          },
          {
            h: "Resources",
            l: ["Guides (coming soon)", "Templates (coming soon)", "Help centre (coming soon)"],
          },
          {
            h: "Company",
            l: ["About", "Contact"],
          },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              {c.h}
            </div>
            <ul className="mt-3 space-y-2 text-[13px]">
              {c.l.map((x) => (
                <li key={x}>
                  <a href="#" className="text-foreground/80 transition hover:text-foreground">
                    {x}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-3 px-6 py-5 text-[12px] text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <a href="mailto:hello@docklist.ai" className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> hello@docklist.ai
            </a>
            <a href="#" aria-label="LinkedIn">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
            <a href="#" aria-label="Twitter">
              <Twitter className="h-3.5 w-3.5" />
            </a>
          </div>
          <div>© 2025 DocklistAI. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

/* -------------------- page -------------------- */

function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <ValueBar />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  );
}
