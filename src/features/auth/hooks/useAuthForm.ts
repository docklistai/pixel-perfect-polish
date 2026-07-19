import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LEGAL_VERSIONS } from "@/features/legal/data/legalMeta";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { resetIdentityScopedClientState } from "../lib/identityBoundary";
import { PASSWORD_HINT, PASSWORD_PATTERN } from "../lib/passwordReset";
import { requestPasswordResetEmail } from "../lib/requestPasswordReset";

// Private beta: manager sign-up is available only when explicitly enabled.
// This keeps production closed unless VITE_MANAGER_SIGNUP_ENABLED=true is set.
export const MANAGER_SIGNUP_ENABLED = import.meta.env.VITE_MANAGER_SIGNUP_ENABLED === "true";

function describeSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "That email and password combination doesn't match. Check the details and try again.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email first — check your inbox for the verification link.";
  }
  return message;
}

/** State and handlers behind the sign-in / private-beta sign-up form. */
export function useAuthForm(onValidSignIn?: () => void) {
  const queryClient = useQueryClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [authError, setAuthError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");
    setStatusMessage("");

    if (!isSignUp && (!email.trim() || !password)) {
      setAuthError("Enter your email and password to continue.");
      return;
    }
    if (isSignUp && !consentAccepted) {
      setAuthError("Please accept the Privacy Policy and Terms of Service to continue.");
      return;
    }
    if (isSignUp && !PASSWORD_PATTERN.test(password)) {
      setAuthError(PASSWORD_HINT);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      if (!isSignUp) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setAuthError(describeSignInError(error.message));
          return;
        }
        // Account switch in the same tab: nothing cached under the previous
        // principal may survive into this session.
        await resetIdentityScopedClientState(queryClient);
        onValidSignIn?.();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            // Operational record of the accepted legal-page versions — not
            // immutable legal evidence. See docs/legal/README.md.
            consent_accepted_at: new Date().toISOString(),
            consent_terms_version: LEGAL_VERSIONS.terms,
            consent_privacy_version: LEGAL_VERSIONS.privacy,
          },
        },
      });
      if (error) {
        setAuthError(error.message);
        return;
      }
      if (!data.session) {
        setStatusMessage("Check your inbox — confirm your email to finish creating your account.");
        return;
      }
      await resetIdentityScopedClientState(queryClient);
      onValidSignIn?.();
    } catch (cause) {
      setAuthError(
        cause instanceof Error && /not configured/i.test(cause.message)
          ? "Sign-in isn't available in this environment yet."
          : "Something went wrong on our end. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setAuthError("Enter your email to reset your password.");
      return;
    }
    setAuthError("");
    setStatusMessage("");
    setLoading(true);
    const result = await requestPasswordResetEmail(email.trim());
    setLoading(false);
    if (result.ok) {
      setStatusMessage(result.message);
    } else {
      setAuthError(result.message);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setAuthError("");
    setStatusMessage("");
    setConsentAccepted(false);
  };

  return {
    isSignUp,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    consentAccepted,
    setConsentAccepted,
    loading,
    statusMessage,
    authError,
    handleSubmit,
    handleResetPassword,
    switchMode,
  };
}

export type AuthFormController = ReturnType<typeof useAuthForm>;
