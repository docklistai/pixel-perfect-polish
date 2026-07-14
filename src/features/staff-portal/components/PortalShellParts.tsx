import { AlertCircle, Bell, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationBell({
  count,
  onClick,
  dark,
}: {
  count: number;
  onClick: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications (${count} unread)`}
      className={cn(
        "relative -mr-2 rounded-lg p-2 transition-colors",
        dark ? "hover:bg-white/10" : "hover:bg-muted/60",
      )}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground"
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function PortalLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[oklch(0.96_0.008_240)] px-6">
      <div className="w-full max-w-[360px] rounded-2xl bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <div
          aria-hidden
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning"
        >
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-base font-semibold">We couldn&apos;t load your portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Check your connection and try again. Your shifts and details are safe.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

export function PortalAvatar({ initials, dark }: { initials: string; dark?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
        dark ? "bg-white/10 text-white" : "bg-brand-soft text-brand",
      )}
    >
      {initials}
    </div>
  );
}
