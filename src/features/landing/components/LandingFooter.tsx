import { Link } from "@tanstack/react-router";

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/40 bg-card py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6">
        {/* Top — brand + nav */}
        <div className="mb-12 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">Docklist</h3>
            <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
              Staff scheduling built for hospitality. Simple tools, clear plans, no nonsense.
            </p>
            <p className="mt-4 text-xs text-muted-foreground/60">Made in Scotland · Bootstrapped</p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Product
            </p>
            <a
              href="#problem"
              className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </a>
            <Link
              to="/auth"
              className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Get Started
            </Link>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Company
            </p>
            <a
              href="mailto:hello@docklist.ai"
              className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/40 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex gap-6 text-sm text-muted-foreground">
              {/* Privacy and terms pages to be added in a future pass */}
              <span className="text-muted-foreground/50">Privacy</span>
              <span className="text-muted-foreground/50">Terms</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} DocklistAI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
