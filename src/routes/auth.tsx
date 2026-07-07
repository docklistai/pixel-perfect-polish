import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AuthValuePanel, AuthForm, redirectActiveMembers } from "@/features/auth";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-cafe-minimal.jpg";
import { Shield, Users, Coffee, KeyRound } from "lucide-react";

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ context }) => redirectActiveMembers(context.auth),
  head: () => ({
    meta: [
      { title: "Sign In — Docklist" },
      {
        name: "description",
        content: "Sign in to Docklist — Rota management for hospitality teams.",
      },
    ],
  }),
  component: AuthPage,
});

function RoleSelector({
  selectedRole,
  onRoleChange,
}: {
  selectedRole: "manager" | "staff";
  onRoleChange: (role: "manager" | "staff") => void;
}) {
  return (
    <div className="flex gap-2 rounded-xl bg-muted/50 p-1">
      <button
        type="button"
        onClick={() => onRoleChange("manager")}
        aria-pressed={selectedRole === "manager"}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          selectedRole === "manager"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Shield className="h-4 w-4" aria-hidden="true" />
        Manager
      </button>
      <button
        type="button"
        onClick={() => onRoleChange("staff")}
        aria-pressed={selectedRole === "staff"}
        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          selectedRole === "staff"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        Staff
      </button>
    </div>
  );
}

function StaffAuthPanel({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Staff sign in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the workspace code and personal access code your manager gave you.
        </p>
      </div>

      <Button asChild size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
        <Link to="/portal/access">Enter my access codes</Link>
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="w-full text-muted-foreground hover:text-foreground"
      >
        ← Back to role selection
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Contact your manager if you've lost your access code
      </p>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = React.useState<"role-select" | "manager" | "staff">(
    "role-select",
  );
  const [selectedRole, setSelectedRole] = React.useState<"manager" | "staff">("manager");

  const handleRoleSelect = (role: "manager" | "staff") => {
    setSelectedRole(role);
    setLoginMode(role);
  };

  const handleBackToRoleSelect = () => {
    setLoginMode("role-select");
  };

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
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-background/90"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/30"
        aria-hidden="true"
      />

      <div className="relative flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-6xl">
          <div className="mb-6 lg:hidden">
            <div className="rounded-2xl border border-border/50 bg-background/90 px-5 py-4 shadow-xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-brand" aria-hidden="true" />
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                      DocklistAI
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Rota management for modern hospitality teams
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-12">
            <div className="order-2 hidden lg:order-1 lg:block">
              <AuthValuePanel />
            </div>

            <div className="order-1 lg:order-2">
              <div className="rounded-2xl border border-border/50 bg-background/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
                {loginMode === "role-select" && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your DocklistAI account
                      </p>
                    </div>

                    <RoleSelector selectedRole={selectedRole} onRoleChange={setSelectedRole} />

                    <Button
                      size="lg"
                      className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                      onClick={() => handleRoleSelect(selectedRole)}
                    >
                      Continue as {selectedRole === "manager" ? "Manager" : "Staff"}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground">
                          New to DocklistAI?
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate({ to: "/landing" })}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      Learn more about DocklistAI →
                    </button>
                  </div>
                )}

                {loginMode === "manager" && (
                  <AuthForm
                    onBackToHome={handleBackToRoleSelect}
                    onValidSignIn={() => navigate({ to: "/" })}
                    variant="embedded"
                    hideHeader
                  />
                )}

                {loginMode === "staff" && <StaffAuthPanel onBack={handleBackToRoleSelect} />}
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">Secure login • GDPR compliant</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
