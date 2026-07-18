import { CheckCircle2, ShieldAlert, FileText, Activity, AlertTriangle } from "lucide-react";

const aiExamples = [
  {
    title: "Review open shifts",
    body: "Shows the recorded open-shift count and links back to the live rota.",
    icon: Activity,
  },
  {
    title: "Review leave",
    body: "Shows pending and approved leave counts without making a decision.",
    icon: ShieldAlert,
  },
  {
    title: "Review timesheets",
    body: "Shows approved and awaiting-review counts from the live workspace.",
    icon: FileText,
  },
  {
    title: "Keep managers in control",
    body: "Routes managers to the source screen; it never changes or publishes data.",
    icon: CheckCircle2,
  },
] as const;

export function LandingAI() {
  return (
    <section
      id="ai"
      className="relative overflow-hidden border-t py-20 text-[var(--landing-cream)] lg:py-28"
      style={{ background: "var(--landing-ink)", borderColor: "rgba(255,255,255,.05)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          background:
            "radial-gradient(circle at 75% 40%, rgba(201,149,77,0.2), transparent 45%), radial-gradient(circle at 25% 70%, rgba(14,165,162,0.15), transparent 45%)",
        }}
      />

      <div className="relative mx-auto max-w-[1240px] px-6 lg:px-10">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="landing-section-eyebrow on-dark">Manager support</span>
            <h2 className="landing-section-title on-dark max-w-[520px]">
              Live facts to check, not guesses.
            </h2>
            <p className="mt-5 max-w-[500px] text-pretty text-[16.5px] leading-[1.62] text-[var(--landing-cream-dim)]">
              Private-beta manager support is deterministic: it summarises recorded rota, leave, and
              timesheet counts and links to the source screen. It is not a free-text AI assistant
              and never acts on its own.
            </p>

            <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {aiExamples.map((example) => {
                const Icon = example.icon;
                return (
                  <div key={example.title}>
                    <div className="mb-2.5 flex items-center gap-2.5 text-[13.5px] font-bold text-[var(--landing-teal-400)]">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--landing-teal)]/10 text-[var(--landing-teal-400)]">
                        <Icon className="size-3.5" aria-hidden="true" />
                      </div>
                      {example.title}
                    </div>
                    <p className="text-[14px] leading-[1.55] text-white/60">{example.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI UI Artifact */}
          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="landing-surface-dark landing-surface-dark-brass relative z-10 overflow-hidden rounded-[24px] p-1">
              <div className="rounded-[20px] border border-white/5 bg-[#101513]/90 px-6 py-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--landing-teal-deep)] text-white shadow-[0_0_15px_rgba(11,122,120,0.6)]">
                      <svg
                        className="size-4.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden="true"
                      >
                        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white">Workspace checks</h3>
                      <p className="landing-mono mt-0.5 text-[10px] uppercase tracking-wider text-white/50">
                        Before publishing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    <span className="size-1.5 rounded-full bg-[#c9954d] shadow-[0_0_8px_rgba(201,149,77,0.8)]" />
                    <span className="landing-mono text-[9px] font-bold uppercase text-[#d9ad70]">
                      3 items
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="group rounded-[14px] border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-[#d9ad70]">
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                        Leave decisions
                      </span>
                      <span className="landing-mono rounded-md bg-[#d9ad70]/10 px-2 py-1 text-[9px] font-bold uppercase text-[#d9ad70] shadow-sm">
                        Review
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-white/70">
                      2 leave requests are waiting for manager review.
                    </p>
                  </div>

                  <div className="group rounded-[14px] border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-white/90">
                        <Activity className="size-3.5 text-white/50" aria-hidden="true" />
                        Open shifts
                      </span>
                      <span className="landing-mono rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase text-white/60">
                        Note
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-white/70">
                      2 open shifts in this week&apos;s live draft still need assignment.
                    </p>
                  </div>

                  <div className="group rounded-[14px] border border-white/5 bg-[var(--landing-teal-deep)]/10 p-4 transition-colors hover:bg-[var(--landing-teal-deep)]/20">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--landing-teal-400)]">
                        <FileText className="size-3.5" aria-hidden="true" />
                        Timesheet review
                      </span>
                    </div>
                    <p className="text-[13px] italic leading-relaxed text-white/80">
                      3 timesheets are waiting for manager review.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-2 items-center justify-center rounded-full bg-[var(--landing-teal)]"
                      aria-hidden="true"
                    >
                      <span className="size-1 rounded-full bg-white motion-safe:animate-pulse" />
                    </span>
                    <span className="text-[12px] font-medium text-white/80">
                      Manager confirms before publish
                    </span>
                  </div>
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white">
                    Review
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div
              aria-hidden="true"
              className="absolute -bottom-8 -right-8 z-0 size-32 bg-[radial-gradient(rgba(255,255,255,0.1)_2px,transparent_2px)] [background-size:12px_12px]"
            />
            <div
              aria-hidden="true"
              className="absolute -left-6 top-10 z-0 size-24 rounded-full bg-[var(--landing-teal-deep)]/20 blur-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
