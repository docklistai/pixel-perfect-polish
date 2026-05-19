import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock } from "lucide-react";
import { navLinks } from "../data/landingContent";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] text-[var(--landing-cream)] transition-all duration-300 ${
        scrolled ? "border-b border-white/10 bg-[var(--landing-ink)]/95 backdrop-blur-md" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-semibold"
          aria-label="DocklistAI home"
        >
          <span className="grid size-9 place-items-center rounded-lg border border-[var(--landing-teal)]/35 bg-[var(--landing-teal)]/15 text-[var(--landing-teal)]">
            <CalendarClock className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg">
            Docklist<span className="text-[var(--landing-teal)]">AI</span>
          </span>
        </a>

        <nav
          className="hidden items-center gap-9 text-sm text-[var(--landing-cream)]/78 md:flex"
          aria-label="Landing navigation"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-[var(--landing-cream)]">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="hidden text-sm text-[var(--landing-cream)]/80 hover:text-[var(--landing-cream)] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--landing-teal)] px-5 py-2.5 text-sm font-semibold text-[var(--landing-ink)] transition hover:bg-[#6ab3ad]"
          >
            Get started
            <ArrowRight
              className="hidden size-4 transition group-hover:translate-x-0.5 sm:block"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
