/**
 * Password rules and recovery-flow helpers shared by the sign-in form and the
 * /auth/reset route. Pure functions only — Supabase calls stay in components
 * and server functions so these stay unit-testable.
 */

export const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PASSWORD_HINT = "At least 8 characters, one uppercase letter, and one number.";

/** Route the recovery email redirects to. Must be allowlisted in Supabase
 * Auth → URL Configuration for every deployed origin (see
 * docs/ai/phase-11-deployment.md). */
export const RESET_REDIRECT_PATH = "/auth/reset";

export type NewPasswordValidation = { ok: true } | { ok: false; message: string };

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): NewPasswordValidation {
  if (!PASSWORD_PATTERN.test(password)) {
    return { ok: false, message: PASSWORD_HINT };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: "Both password fields must match." };
  }
  return { ok: true };
}

/**
 * Failed recovery links (expired, already used, tampered) come back from
 * Supabase with error params in the URL hash or query rather than a session.
 * Returns honest user-facing copy, or null when no error params are present.
 */
export function describeRecoveryLinkError(location: {
  hash: string;
  search: string;
}): string | null {
  const hash = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(location.search);
  const errorCode = hashParams.get("error_code") ?? queryParams.get("error_code");
  const error = hashParams.get("error") ?? queryParams.get("error");
  if (!errorCode && !error) return null;
  if (errorCode === "otp_expired") {
    return "That reset link has expired. Request a new one from the sign-in page.";
  }
  return "That reset link isn't valid any more. Request a new one from the sign-in page.";
}

/**
 * PKCE recovery links carry `?code=`. The code can only be exchanged in the
 * browser that requested the reset (that browser holds the code verifier), so
 * the reset page attempts an explicit exchange and fails fast with honest
 * copy instead of waiting for a session that cannot exist cross-device.
 */
export function getRecoveryCodeFromUrl(search: string): string | null {
  const code = new URLSearchParams(search).get("code");
  return code && code.trim() ? code : null;
}

/** Copy for a failed explicit code exchange (wrong browser, used, expired). */
export const RECOVERY_EXCHANGE_FAILED_MESSAGE =
  "That reset link couldn't be opened here. Open it in the same browser you requested it from, or request a new link from the sign-in page.";

/** Maps supabase.auth.updateUser failures to non-leaking user-facing copy. */
export function describePasswordUpdateError(message: string): string {
  if (/different from the old password|same password/i.test(message)) {
    return "Choose a password different from your current one.";
  }
  if (/auth session missing|not authenticated|session.*(expired|missing)/i.test(message)) {
    return "Your reset session has expired. Request a new link from the sign-in page.";
  }
  return "We couldn't update your password. Please try again.";
}
