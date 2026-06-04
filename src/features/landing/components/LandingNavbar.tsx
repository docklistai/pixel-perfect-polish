import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
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
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-all duration-200 ${
        scrolled ? "border-b border-white/10 bg-[var(--landing-ink)]/95 backdrop-blur-md" : ""
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5 sm:h-16 sm:px-6 lg:px-10">
        {/* Brand */}
        <a
          href="#top"
          className="flex items-center gap-2.5 text-[16px] font-bold text-[var(--landing-cream)] sm:text-[17px]"
          aria-label="DocklistAI home"
        >
          <span
            className="grid size-7 place-items-center rounded-lg text-sm font-extrabold"
            style={{
              background: "linear-gradient(135deg,var(--landing-teal-400),var(--landing-teal))",
              color: "#08222A",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)",
            }}
            aria-hidden="true"
          >
            D
          </span>
          <span>DocklistAI</span>
        </a>

        {/* Nav links */}
        <nav
          className="hidden items-center gap-[30px] text-[13.5px] text-[var(--landing-cream)]/72 md:flex"
          aria-label="Landing navigation"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[var(--landing-cream)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-[18px] text-[13.5px]">
          <Link
            to="/auth"
            className="hidden text-[var(--landing-cream)]/72 transition-colors hover:text-[var(--landing-cream)] sm:inline-flex"
          >
            Sign in
          </Link>
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-[10px] bg-[#c9954d] px-3.5 py-2.5 text-[13px] font-semibold text-[#111714] shadow-[0_1px_0_rgba(255,255,255,.2)_inset,0_1px_2px_rgba(0,0,0,.10)] transition hover:-translate-y-px hover:bg-[#d6a865] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3eee5] sm:px-[17px] sm:py-[11px] sm:text-[13.5px]"
          >
            Get Pro access
            <ArrowRight
              className="size-3.5 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </header>
  );
}
