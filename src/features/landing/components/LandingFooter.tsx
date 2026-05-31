import { CalendarClock } from "lucide-react";

const footerGroups = [
  {
    title: "Product",
    links: ["Weekly rhythm", "The workspace", "AI support", "Pricing"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Made in Scotland"],
  },
  {
    title: "Get started",
    links: ["Early access", "Preview the manager app"],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--landing-ink)] pb-12 text-[var(--landing-cream)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 border-t border-white/10 pt-12 text-sm text-[var(--landing-cream)]/55 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <a
              href="#top"
              className="mb-4 flex w-fit items-center gap-2.5 font-semibold text-[var(--landing-cream)]"
              aria-label="DocklistAI home"
            >
              <span className="grid size-9 place-items-center rounded-lg border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/15 text-[var(--landing-teal)]">
                <CalendarClock className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg">
                Docklist<span className="text-[var(--landing-teal)]">AI</span>
              </span>
            </a>
            <p className="max-w-sm leading-6">
              The scheduling workspace for hospitality teams — rota, light workforce admin, and
              manager-led AI support. Made in Scotland.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="landing-mono mb-4 text-[10px] uppercase tracking-[0.2em] text-white/40">
                {group.title}
              </h2>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link}>
                    <span className="text-[var(--landing-cream)]/72 hover:text-[var(--landing-cream)]">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="landing-mono mt-12 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-[10px] uppercase tracking-[0.16em] text-white/40">
          <span>© 2026 DocklistAI · Hospitality scheduling workspace</span>
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--landing-teal)]" />
            Made in Scotland
          </span>
        </div>
      </div>
    </footer>
  );
}
