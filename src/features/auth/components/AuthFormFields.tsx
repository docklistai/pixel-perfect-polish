import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_WORLD } from "@/features/demo/data/demoWorld";
import { PASSWORD_HINT } from "../lib/passwordReset";
import { MANAGER_SIGNUP_ENABLED, type AuthFormController } from "../hooks/useAuthForm";
import { AuthNextStepNotice } from "./AuthNextStepNotice";
import { PasswordChecklist } from "./PasswordChecklist";
import { SignupConsentSection } from "./SignupConsentSection";

interface AuthFormFieldsProps {
  form: AuthFormController;
}

/** The shared sign-in / sign-up form body rendered inside both AuthForm variants. */
export function AuthFormFields({ form }: AuthFormFieldsProps) {
  return (
    <div className="space-y-5">
      {(form.statusMessage || form.authError) && (
        <Alert variant={form.authError ? "destructive" : "default"}>
          <AlertTitle>{form.authError ? "Something went wrong" : "Note"}</AlertTitle>
          <AlertDescription>{form.authError || form.statusMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-4">
        {form.isSignUp && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={form.displayName}
              onChange={(e) => form.setDisplayName(e.target.value)}
              required={form.isSignUp}
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
            value={form.email}
            onChange={(e) => form.setEmail(e.target.value)}
            required={form.isSignUp}
            aria-invalid={Boolean(form.authError)}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => form.setPassword(e.target.value)}
            required={form.isSignUp}
            aria-invalid={Boolean(form.authError)}
            minLength={form.isSignUp ? 8 : 1}
            autoComplete={form.isSignUp ? "new-password" : "current-password"}
          />
          {form.isSignUp && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
              <PasswordChecklist password={form.password} />
            </div>
          )}
          {!form.isSignUp && (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 text-xs"
              onClick={form.handleResetPassword}
              disabled={form.loading}
            >
              Forgot password?
            </Button>
          )}
        </div>

        {form.isSignUp && (
          <SignupConsentSection
            accepted={form.consentAccepted}
            onAcceptedChange={form.setConsentAccepted}
          />
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={form.loading || (form.isSignUp && !form.consentAccepted)}
        >
          {form.loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{form.isSignUp ? "Creating account..." : "Signing in..."}</span>
            </span>
          ) : form.isSignUp ? (
            "Sign Up"
          ) : (
            "Sign In"
          )}
        </Button>

        {!form.isSignUp && <AuthNextStepNotice />}
        {/* Seeded local credentials — dev builds only, never shipped to prod. */}
        {!form.isSignUp && import.meta.env.DEV && (
          <p className="text-center text-xs text-muted-foreground">
            Demo manager: <strong>{DEMO_WORLD.manager.email}</strong> · password{" "}
            <strong>{DEMO_WORLD.manager.password}</strong>
          </p>
        )}
      </form>

      {MANAGER_SIGNUP_ENABLED && (
        <div className="border-t border-border/60 pt-4 text-center">
          <Button variant="ghost" onClick={form.switchMode} className="text-sm">
            {form.isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </Button>
        </div>
      )}
    </div>
  );
}
