import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

/**
 * Password-recovery landing page. Deliberately has no auth guard: the
 * recovery link signs the user in with a temporary session, so a member
 * guard (redirectActiveMembers) would bounce them away before they could
 * set a new password.
 */
export const Route = createFileRoute("/auth_/reset")({
  head: () => ({
    meta: [
      { title: "Reset password — Docklist" },
      {
        name: "description",
        content: "Choose a new password for your Docklist account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 focus:outline-none"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/50 bg-background/95 p-6 shadow-2xl sm:p-8">
          <div className="mb-5 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
          </div>
          <ResetPasswordForm />
        </div>

        <div className="mt-4 text-center">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Back to sign in →
          </Link>
        </div>
      </div>
    </main>
  );
}
