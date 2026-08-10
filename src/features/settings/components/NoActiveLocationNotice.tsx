import { MapPin } from "lucide-react";
import { SUPPORT_EMAIL } from "@/config/commercial";

/**
 * Shown in place of the Location and Time zone fields when the workspace has no
 * active location.
 *
 * Both fields describe a location, so with none there is nothing to edit and a
 * disabled empty form would only imply that typing a name would create one.
 * Creating locations is not a Settings capability — workspace bootstrap makes
 * the first one — so this states the situation and points at the one route that
 * can actually resolve it.
 */
export function NoActiveLocationNotice({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning-soft/25 p-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
        <div className="space-y-1">
          <div className="text-sm font-semibold">No active location</div>
          <p className="text-xs leading-5 text-muted-foreground">
            Rotas are scheduled against a location, so this workspace can&apos;t build one until it
            has an active location again. Settings can rename a location and set its time zone, but
            it can&apos;t create one — your workspace was set up with a location, so this state
            needs to be restored for you. Email{" "}
            <span className="font-medium text-foreground">{SUPPORT_EMAIL}</span> and we&apos;ll sort
            it.
          </p>
        </div>
      </div>
    </div>
  );
}
