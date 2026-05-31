import { FileEdit, Gauge, Search, Sparkles, Wand2 } from "lucide-react";

const capabilities = [
  {
    title: "Reviews rota issues",
    body: "Surfaces open shifts, clashes and coverage pressure as a clear list of things worth checking before you publish.",
    Icon: Search,
  },
  {
    title: "Suggests fixes",
    body: "Proposes a way to cover a gap or resolve a clash. You see the suggestion, then accept, adjust or ignore it.",
    Icon: Wand2,
  },
  {
    title: "Drafts staff updates",
    body: "Prepares a clear, staff-facing note about a change. It stays a draft until you review and choose to share it.",
    Icon: FileEdit,
  },
  {
    title: "Explains the pressure",
    body: "Makes labour and coverage numbers legible — why a day is tight, where hours are heavy, what's near target.",
    Icon: Gauge,
  },
] as const;

const guardrails = [
  "AI suggests, manager decides",
  "Nothing publishes without you",
  "Review before acting",
] as const;

export function LandingManagerAI() {
  return (
    <section
      id="ai"
      className="relative overflow-hidden bg-[var(--landing-ink)] py-24 text-[var(--landing-cream)] sm:py-32"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_0%,rgba(91,162,156,0.10),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-20">
          <div>
            <p className="landing-section-eyebrow text-[var(--landing-teal)]">Manager-led AI</p>
            <h2 className="landing-section-title text-[var(--landing-cream)]">
              AI that helps managers check, not{" "}
              <span className="italic text-[var(--landing-teal)]">guess.</span>
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-[17px] leading-7 text-[var(--landing-cream)]/65">
              A practical support layer sitting beside the rota — it reviews, summarises and
              drafts, then hands the decision back to you. Nothing happens until you confirm.
            </p>

            <div className="mt-10 rounded-xl border border-[var(--landing-teal)]/25 bg-[var(--landing-teal)]/[0.06] p-6 sm:p-7">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-[var(--landing-teal)]" aria-hidden="true" />
                <span className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-teal)]">
                  Ask · summarise this week&apos;s leave impact
                </span>
              </div>
              <p className="mt-4 text-[15.5px] leading-7 text-[var(--landing-cream)]/85">
                Priya&apos;s two days off drop housekeeping coverage by{" "}
                <span className="font-semibold text-[var(--landing-teal)]">4%</span> and create{" "}
                <span className="font-semibold text-[var(--landing-teal)]">2 open shifts</span>.
                Want a draft staff update to review?
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-[var(--landing-teal)] px-3.5 py-2 text-[12px] font-semibold text-[var(--landing-ink)]">
                  Draft update
                </span>
                <span className="inline-flex items-center rounded-md border border-white/15 px-3.5 py-2 text-[12px] font-medium text-[var(--landing-cream)]/80">
                  Not now
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((c) => (
              <article
                key={c.title}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-[#10201d] to-[#0b1614] p-6"
              >
                <span className="grid size-9 place-items-center rounded-lg border border-[var(--landing-teal)]/30 bg-[var(--landing-teal)]/10 text-[var(--landing-teal)]">
                  <c.Icon className="size-4" aria-hidden="true" />
                </span>
                <h3 className="font-serif text-[19px] font-medium tracking-[-0.012em] text-[var(--landing-cream)]">
                  {c.title}
                </h3>
                <p className="text-[14px] leading-6 text-[var(--landing-cream)]/65">{c.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-7 landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/55">
          {guardrails.map((g) => (
            <span key={g} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
              {g}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
