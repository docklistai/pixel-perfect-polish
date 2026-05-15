import { CalendarClock } from "lucide-react";
import { footerColumns } from "../data/landingContent";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-[#07171d] py-14 text-[#f5efe2]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#56b8a3]/40 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <a
              href="#top"
              className="flex w-fit items-center gap-2.5 font-semibold"
              aria-label="DocklistAI home"
            >
              <span className="flex size-9 items-center justify-center rounded-lg border border-[#56b8a3]/30 bg-[#56b8a3]/15 text-[#56b8a3]">
                <CalendarClock className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg">
                Docklist<span className="text-[#56b8a3]">AI</span>
              </span>
            </a>
            <p className="mt-5 max-w-sm text-pretty text-sm leading-6 text-[#b8c4c5]">
              The rota-first workspace for hospitality teams.
            </p>
            <p className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-sm text-[#b8c4c5]">
              Made in Scotland. Built from real hospitality rota problems.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#f5efe2]">{column.title}</h2>
                {column.comingSoon && (
                  <span className="rounded bg-[#c9a074]/20 px-2 py-1 text-xs text-[#e6c89f]">
                    Coming soon
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={`text-sm hover:text-[#f5efe2] ${
                        column.comingSoon ? "text-[#b8c4c5]/55" : "text-[#b8c4c5]"
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-[#9fb2b4] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; 2026 DocklistAI Ltd. All rights reserved.</p>
          <p>Cafes, restaurants, bars, hotels, and venues.</p>
        </div>
      </div>
    </footer>
  );
}
