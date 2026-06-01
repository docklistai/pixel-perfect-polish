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
      className="border-t border-[#0c1412]/10 bg-[var(--landing-cream)] py-24 text-[var(--landing-ink)] sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-20">
          <div>
            <p className="landing-section-eyebrow">Manager-led AI</p>
            <h2 className="landing-section-title">
              AI that helps managers check, not{" "}
              <span className="italic text-[var(--landing-teal-deep)]">guess.</span>
            </h2>
            <p className="mt-6 max-w-lg text-pretty text-[17px] leading-7 text-[#3f4744]">
              A practical support layer sitting beside the rota — it reviews, summarises and
              drafts, then hands the decision back to you. Nothing happens until you confirm.
            </p>
          </div>

          <div className="rounded-2xl border border-[#0c1412]/12 bg-gradient-to-b from-[#0f1e1c] to-[#0a1413] p-7 text-[var(--landing-cream)] shadow-[0_40px_100px_-50px_rgba(12,20,18,0.55)] sm:p-8">
            <span className="grid size-9 place-items-center rounded-lg border border-[var(--landing-teal)]/30 bg-[var(--landing-teal)]/12 text-[var(--landing-teal)]">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-serif text-[26px] font-medium leading-tight tracking-[-0.018em] text-[var(--landing-cream)]">
              A practical manager support layer —<br />
              <span className="text-[var(--landing-cream)]/72">not an autopilot.</span>
            </h3>
            <p className="mt-4 text-[15px] leading-7 text-[var(--landing-cream)]/68">
              It reviews the rota, summarises what changed, and drafts the message you&apos;d
              otherwise type at 22:00. You stay in the seat.
            </p>

            <div className="mt-7 rounded-xl border border-[var(--landing-teal)]/25 bg-[var(--landing-teal)]/[0.06] p-5">
              <p className="landing-mono text-[10px] uppercase tracking-[0.18em] text-[var(--landing-teal)]">
                Ask · summarise this week&apos;s leave impact
              </p>
              <p className="mt-3 text-[14.5px] leading-6 text-[var(--landing-cream)]/88">
                Priya&apos;s two days off drop housekeeping coverage by{" "}
                <span className="font-semibold text-[var(--landing-teal)]">4%</span> and create{" "}
                <span className="font-semibold text-[var(--landing-teal)]">2 open shifts</span>.
                Want a draft staff update to review?
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-[var(--landing-teal)] px-3 py-1.5 text-[12px] font-semibold text-[var(--landing-ink)]">
                  Draft update
                </span>
                <span className="inline-flex items-center rounded-md border border-white/15 px-3 py-1.5 text-[12px] font-medium text-[var(--landing-cream)]/80">
                  Not now
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((c) => (
            <article
              key={c.title}
              className="flex flex-col gap-3 rounded-xl border border-[#0c1412]/10 bg-[var(--landing-paper)] p-6"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-[var(--landing-teal)]/15 text-[var(--landing-teal-deep)]">
                <c.Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="font-semibold text-[15px] text-[var(--landing-ink)]">{c.title}</h3>
              <p className="text-[13.5px] leading-6 text-[#4f564f]">{c.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#0c1412]/10 pt-7 landing-mono text-[10px] uppercase tracking-[0.18em] text-[#5c645f]">
          {guardrails.map((g) => (
            <span key={g} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--landing-teal-deep)]" />
              {g}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
