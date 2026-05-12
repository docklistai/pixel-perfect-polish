import { KeyRound } from "lucide-react";

export function StaffPortalClaimFields() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/10 p-4">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Staff workspace access</p>
        <p className="text-xs leading-5 text-muted-foreground">
          Staff access by organisation name and access code will be available when staff onboarding
          is connected.
        </p>
      </div>
    </div>
  );
}
