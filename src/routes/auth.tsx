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
      {/* Background photo */}
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
      />
      <div className="pointer-events-none absolute inset-0 bg-background/75" aria-hidden="true" />

      <div className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:gap-10">
            {/* Value panel — desktop only */}
            <div className="order-2 hidden lg:order-1 lg:block">
              <AuthValuePanel />
            </div>

            {/* Form */}
            <div className="order-1 lg:order-2">
              <AuthForm onBackToHome={() => navigate({ to: "/landing" })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
