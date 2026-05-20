import { useState, type FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordChecklist } from "./PasswordChecklist";
import { AuthModeToggle } from "./AuthModeToggle";
import { AuthNextStepNotice } from "./AuthNextStepNotice";

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_HINT = "At least 8 characters, one uppercase letter, and one number.";

interface AuthFormProps {
  onBackToHome: () => void;
  /** When "embedded", omits the outer Card wrapper and branding block. */
  variant?: "standalone" | "embedded";
  /** Suppress the "Welcome back" heading when it would duplicate a parent heading. */
  hideHeader?: boolean;
}

export function AuthForm({
  onBackToHome,
  variant = "standalone",
  hideHeader = false,
}: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [authError, setAuthError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");
    setStatusMessage("");

    if (isSignUp && !consentAccepted) {
      setAuthError("Please accept the Privacy Policy and Terms of Service to continue.");
      return;
    }
    if (isSignUp && !PASSWORD_PATTERN.test(password)) {
      setAuthError(PASSWORD_HINT);
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAuthError(
        isSignUp
          ? "Sign up is not available yet. Please check back soon."
          : "Sign in is not available yet. Please check back soon.",
      );
    }, 600);
  };

  const handleResetPassword = () => {
    if (!email) {
      setAuthError("Enter your email to reset your password.");
      return;
    }
    setAuthError("");
    setStatusMessage("Password reset is not available yet. Please check back soon.");
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
    setStatusMessage("");
    setConsentAccepted(false);
  };

  const formContent = (
    <div className="space-y-5">
      {(statusMessage || authError) && (
        <Alert variant={authError ? "destructive" : "default"}>
          <AlertTitle>{authError ? "Something went wrong" : "Note"}</AlertTitle>
          <AlertDescription>{authError || statusMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required={isSignUp}
              autoComplete="name"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isSignUp ? 8 : 1}
            autoComplete={isSignUp ? "new-password" : "current-password"}
          />
          {isSignUp && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              <PasswordChecklist password={password} />
            </div>
          )}
          {!isSignUp && (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 text-xs"
              onClick={handleResetPassword}
            >
              Forgot password?
            </Button>
          )}
        </div>

        {isSignUp && (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="signup-consent"
                checked={consentAccepted}
                onCheckedChange={(checked) => setConsentAccepted(Boolean(checked))}
                aria-required="true"
              />
              <label
                htmlFor="signup-consent"
                className="cursor-pointer text-xs leading-relaxed text-muted-foreground"
              >
                I agree to the <span className="text-brand">Privacy Policy</span> and{" "}
                <span className="text-brand">Terms of Service</span>, and acknowledge our use of
                analytics, email notifications, and data collection as described.
              </label>
            </div>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={loading || (isSignUp && !consentAccepted)}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{isSignUp ? "Creating account..." : "Signing in..."}</span>
            </span>
          ) : isSignUp ? (
            "Sign Up"
          ) : (
            "Sign In"
          )}
        </Button>

        {!isSignUp && <AuthNextStepNotice />}
      </form>

      <div className="border-t border-border/60 pt-4 text-center">
        <Button variant="ghost" onClick={switchMode} className="text-sm">
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </Button>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-5">
        {!hideHeader && (
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {isSignUp ? "Start your team setup" : "Welcome back"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Create your account and move directly into workspace setup."
                : "Use your workspace email and password to continue."}
            </p>
          </div>
        )}
        <div className="flex justify-center">
          <AuthModeToggle isSignUp={isSignUp} onSwitchMode={switchMode} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToHome}
          className="-mt-1 w-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to role selection
        </Button>
        {formContent}
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
              {isSignUp ? "Start your team setup" : "Welcome back"}
            </h1>
            <p className="mx-auto max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
              {isSignUp
                ? "Create your account and move directly into workspace setup."
                : "Pick up where you left off and get back into rota, team, and operations work."}
            </p>
          </div>
        )}
      </div>
      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-[0_20px_60px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
        <CardHeader className="space-y-4 border-b border-border/60 bg-background/70 pb-5 text-center">
          <div className="flex justify-center">
            <AuthModeToggle isSignUp={isSignUp} onSwitchMode={switchMode} />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {isSignUp
              ? "Set up your access once, then finish onboarding from the live product."
              : "Use your workspace email and password to continue."}
          </p>
        </CardHeader>

        <CardContent className="space-y-5 p-6 pt-6 sm:p-7 sm:pt-7">{formContent}</CardContent>
      </Card>

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>No credit card required. Start building your rota straight away.</p>
        {isSignUp && (
          <p className="text-xs">
            You&apos;ll receive an email to verify your account after signing up.
          </p>
        )}
      </div>
    </div>
  );
}
