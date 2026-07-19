import { AlertTriangle, Loader2 } from "lucide-react";
import { DashboardCard } from "@/components/dl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dedicated loading / error surface for the live dashboard. Rendered instead
 * of the KPI and attention panels until every required read settles, so the
 * home screen never shows zeros, demo figures, or an "all clear" it hasn't
 * actually verified.
 */
export function DashboardLiveReadState({
  isError,
  onRetry,
}: {
  isError: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <DashboardCard className="p-8">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Your workspace overview couldn't be loaded
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We couldn't reach your workspace data, so no numbers are shown rather than showing
            numbers that might be wrong.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div aria-busy="true" className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>Loading your workspace overview…</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <DashboardCard key={index} className="p-4">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="mt-3 h-8 w-16 rounded" />
            <Skeleton className="mt-2 h-3 w-32 rounded" />
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}
