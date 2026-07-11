import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MANAGER_SIGNUP_ENABLED, useAuthForm } from "../hooks/useAuthForm";
import { AuthFormFields } from "./AuthFormFields";
import { AuthModeToggle } from "./AuthModeToggle";

interface AuthFormProps {
  onBackToHome: () => void;
  /** When "embedded", omits the outer Card wrapper and branding block. */
  variant?: "standalone" | "embedded";
  /** Suppress the "Welcome back" heading when it would duplicate a parent heading. */
  hideHeader?: boolean;
  onValidSignIn?: () => void;
}

export function AuthForm({
  onBackToHome,
  variant = "standalone",
  hideHeader = false,
  onValidSignIn,
}: AuthFormProps) {
  const form = useAuthForm(onValidSignIn);

  if (variant === "embedded") {
    return (
      <div className="space-y-5">
        {!hideHeader && (
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {form.isSignUp ? "Private beta access" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {form.isSignUp
                ? "DocklistAI is invite-only — your workspace is set up for you by our team."
                : "Use your workspace email and password to continue."}
            </p>
          </div>
        )}
        {MANAGER_SIGNUP_ENABLED && (
          <div className="flex justify-center">
            <AuthModeToggle isSignUp={form.isSignUp} onSwitchMode={form.switchMode} />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToHome}
          className="-mt-1 w-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to role selection
        </Button>
        <AuthFormFields form={form} />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToHome}
          className="mb-3 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to role selection
        </Button>

        {!hideHeader && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
              Secure workspace access
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {form.isSignUp ? "Private beta access" : "Welcome back"}
            </h1>
            <p className="mx-auto max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
              {form.isSignUp
                ? "DocklistAI is invite-only — your workspace is set up for you by our team."
                : "Pick up where you left off and get back into rota, team, and operations work."}
            </p>
          </div>
        )}
      </div>
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-[0_20px_60px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
        <CardHeader className="space-y-4 border-b border-border/60 bg-background/70 pb-5 text-center">
          {MANAGER_SIGNUP_ENABLED && (
            <div className="flex justify-center">
              <AuthModeToggle isSignUp={form.isSignUp} onSwitchMode={form.switchMode} />
            </div>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            {form.isSignUp
              ? "Private beta access is arranged directly with the DocklistAI team."
              : "Use your workspace email and password to continue."}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 p-6 pt-6 sm:p-7 sm:pt-7">
          <AuthFormFields form={form} />
        </CardContent>
      </Card>

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>Private beta access is arranged directly with the DocklistAI team.</p>
        {form.isSignUp && (
          <p className="text-xs">
            You&apos;ll receive an email to verify your account after signing up.
          </p>
        )}
      </div>
    </div>
  );
}
