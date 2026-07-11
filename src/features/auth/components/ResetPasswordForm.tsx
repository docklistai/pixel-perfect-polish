import * as React from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { clearAuthStateCache } from "../authStateCache";
import {
  describePasswordUpdateError,
  describeRecoveryLinkError,
  getRecoveryCodeFromUrl,
  PASSWORD_HINT,
  RECOVERY_EXCHANGE_FAILED_MESSAGE,
  validateNewPassword,
} from "../lib/passwordReset";
import { PasswordChecklist } from "./PasswordChecklist";

type RecoveryPhase = "checking" | "ready" | "missing";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const router = useRouter();
  const [phase, setPhase] = React.useState<RecoveryPhase>("checking");
  const [linkError, setLinkError] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const explicitError = describeRecoveryLinkError(window.location);
    if (explicitError) {
      setLinkError(explicitError);
      setPhase("missing");
      return;
    }

    let cancelled = false;
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setLinkError("Password reset isn't available in this environment yet.");
      setPhase("missing");
      return;
    }

    // Same-browser links are exchanged automatically by the PKCE client during
    // initialisation (getSession awaits it). Cross-device links carry a `code`
    // this browser cannot auto-exchange (no stored verifier), so try once
    // explicitly and resolve to an honest terminal state either way.
    const resolveRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setPhase("ready");
        return;
      }

      const code = getRecoveryCodeFromUrl(window.location.search);
      if (code) {
        const { data: exchanged, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (!error && exchanged.session) {
          setPhase("ready");
          return;
        }
        setLinkError(RECOVERY_EXCHANGE_FAILED_MESSAGE);
        setPhase("missing");
        return;
      }

      setLinkError(
        "We couldn't find an active reset session. The link may have expired or already been used — request a new one from the sign-in page.",
      );
      setPhase("missing");
    };

    void resolveRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    const validation = validateNewPassword(password, confirmPassword);
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(describePasswordUpdateError(error.message));
        return;
      }
      // The recovery session has served its purpose — end it so the user
      // signs in explicitly with the new password.
      await supabase.auth.signOut();
      clearAuthStateCache();
      await router.invalidate();
      toast.success("Password updated", { description: "Sign in with your new password." });
      await navigate({ to: "/auth" });
    } catch {
      setFormError("Something went wrong on our end. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "checking") {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Checking your reset link…</span>
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <div className="space-y-5">
        <Alert variant="destructive">
          <AlertTitle>We couldn't open this reset link</AlertTitle>
          <AlertDescription>{linkError}</AlertDescription>
        </Alert>
        <Button
          asChild
          size="lg"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
        >
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>Password not updated</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={Boolean(formError)}
          />
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            <PasswordChecklist password={password} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-password-confirm">Confirm new password</Label>
          <Input
            id="reset-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={Boolean(formError)}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={submitting}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Updating password…</span>
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
