import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, ClipboardList, Inbox, LayoutGrid, Users } from "lucide-react";

const sidebarItems = [
  { Icon: Calendar, label: "Rota", count: "3", active: true },
  { Icon: Users, label: "Staff" },
  { Icon: Inbox, label: "Leave", count: "4" },
  { Icon: ClipboardList, label: "Ops handover" },
  { Icon: LayoutGrid, label: "Reports" },
] as const;

const chips = ["Interactive walkthrough", "Full manager app", "No sign-up"];

export function LandingWalkthrough() {
  return (
    <section className="relative bg-[var(--landing-ink)] py-10 text-[var(--landing-cream)] sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--landing-teal)]/20 bg-gradient-to-br from-[#0d1f1d] via-[#0a1816] to-[#08110f] p-8 sm:p-14 lg:p-16">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_88%_50%,rgba(91,162,156,0.18),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <p className="landing-section-eyebrow text-[var(--landing-teal)]">
                The full workspace
              </p>
              <h2 className="landing-section-title mt-5 text-[var(--landing-cream)]">
                Want to walk the{" "}
                <span className="italic text-[var(--landing-teal)]">whole week?</span>
              </h2>
              <p className="mt-6 max-w-md text-pretty text-[16.5px] leading-7 text-[var(--landing-cream)]/68">
                The landing shows the highlights. The manager app is where you walk it end to end —
                rota, staff, leave, approved hours, handover and AI support, exactly as a manager
                would on a Monday.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth"
                  className="group inline-flex items-center justify-center gap-3 rounded-lg bg-[var(--landing-teal)] px-6 py-3.5 text-sm font-semibold text-[var(--landing-ink)] transition hover:bg-[#6ab3ad]"
                >
                  Preview the manager app
                  <ArrowRight
                    className="size-4 transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-[var(--landing-cream)] transition hover:bg-white/10"
                >
                  Get early access
                </Link>
              </div>

              <div className="landing-mono mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.18em] text-[var(--landing-cream)]/55">
                {chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* App preview mockup */}
            <div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-md translate-y-2 rounded-xl border border-white/10 bg-[#0c1816] shadow-[0_50px_120px_-50px_rgba(0,0,0,0.7)] sm:translate-y-6 lg:translate-y-10"
            >
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="landing-mono ml-auto text-[10px] uppercase tracking-[0.16em] text-[var(--landing-cream)]/40">
                  docklist.app / harbour-view
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-3">
                  <span className="grid size-10 place-items-center rounded-md bg-[var(--landing-teal)] text-[15px] font-bold text-[var(--landing-ink)]">
                    D
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold text-[var(--landing-cream)]">
                      Harbour View Hotel
                    </span>
                    <span className="landing-mono text-[10px] uppercase tracking-[0.14em] text-[var(--landing-cream)]/50">
                      Manager workspace
                    </span>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {sidebarItems.map((it) => (
                    <li
                      key={it.label}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] ${
                        it.active
                          ? "bg-[var(--landing-teal)]/12 text-[var(--landing-cream)]"
                          : "text-[var(--landing-cream)]/70"
                      }`}
                    >
                      <it.Icon className="size-4 text-[var(--landing-teal)]" />
                      <span className="flex-1">{it.label}</span>
                      {it.count && (
                        <span className="landing-mono rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] text-[var(--landing-cream)]/70">
                          {it.count}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-5 w-full rounded-lg bg-[var(--landing-teal)] px-4 py-2.5 text-[13px] font-semibold text-[var(--landing-ink)]"
                >
                  Open the walkthrough
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
