import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthValuePanel, AuthForm } from "@/features/auth";
import heroBg from "@/assets/hero-cafe-minimal.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Docklist" },
      { name: "description", content: "Sign in or create your Docklist account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-background/52 md:bg-background/46"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/18 via-background/26 to-background/60"
        aria-hidden="true"
      />

      <div className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-6xl">
          <div className="mb-6 lg:hidden">
            <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-4 shadow-[0_18px_45px_color-mix(in_oklch,var(--foreground)_6%,transparent)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                    Docklist
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    Bring your rota, team, and time back under control.
                  </p>
                </div>
                <span className="rounded-full border border-brand/15 bg-brand-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                  Hospitality
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1.5">
                  Role-based permissions
                </span>
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1.5">
                  Staff access codes
                </span>
                <span className="rounded-full border border-border/50 bg-background/70 px-3 py-1.5">
                  Payroll-ready exports
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-10">
            {/* Value panel — desktop only */}
            <div className="order-2 hidden lg:order-1 lg:block">
              <AuthValuePanel />
            </div>

            {/* Form */}
            <div className="order-1 lg:order-2">
              <AuthForm onBackToHome={() => navigate({ to: "/" })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
