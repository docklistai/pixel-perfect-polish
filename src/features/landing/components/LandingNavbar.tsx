import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { navLinks } from "../data/landingContent";

export function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#07171d]/85 pt-[env(safe-area-inset-top)] text-[#f5efe2] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl supports-[backdrop-filter]:bg-[#07171d]/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-semibold"
          aria-label="DocklistAI home"
        >
          <span className="flex size-9 items-center justify-center rounded-lg border border-[#56b8a3]/30 bg-[#56b8a3]/15 text-[#56b8a3]">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg">
            Docklist<span className="text-[#56b8a3]">AI</span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-7 text-sm text-[#d8d0bd]/80 md:flex"
          aria-label="Landing navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#f5efe2] focus-visible:text-[#f5efe2]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth"
            className="hidden rounded-full px-4 py-2 text-sm text-[#d8d0bd]/80 hover:text-[#f5efe2] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-full bg-[#56b8a3] px-4 py-2 text-sm font-semibold text-[#07171d] shadow-[0_10px_25px_-10px_rgba(86,184,163,0.6)] ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 hover:bg-[#6cc7b4] sm:px-5"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
