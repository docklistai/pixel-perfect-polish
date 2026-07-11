import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { RESET_REDIRECT_PATH } from "./passwordReset";

export interface RequestPasswordResetResult {
  ok: boolean;
  message: string;
}

/**
 * Sends the Supabase recovery email pointing at /auth/reset. Never confirms
 * whether an account exists — the success copy stays deliberately neutral.
 */
export async function requestPasswordResetEmail(
  email: string,
): Promise<RequestPasswordResetResult> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${RESET_REDIRECT_PATH}`,
    });
    if (error) {
      return {
        ok: false,
        message: /rate limit/i.test(error.message)
          ? "Too many reset requests. Please wait a minute and try again."
          : "We couldn't send the reset email. Please try again.",
      };
    }
    return {
      ok: true,
      message: `If an account exists for ${email}, we've sent a password-reset link. Check your inbox.`,
    };
  } catch (cause) {
    return {
      ok: false,
      message:
        cause instanceof Error && /not configured/i.test(cause.message)
          ? "Password reset isn't available in this environment yet."
          : "Something went wrong on our end. Please try again.",
    };
  }
}
