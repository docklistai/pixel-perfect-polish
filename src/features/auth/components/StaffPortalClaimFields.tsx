import { KeyRound } from "lucide-react";

export function StaffPortalClaimFields() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/10 bg-brand-soft text-brand">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Preview only
          </span>
          <p className="text-sm font-semibold text-foreground">Staff workspace access</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Staff access by organisation name and access code will be available when staff
            onboarding is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
