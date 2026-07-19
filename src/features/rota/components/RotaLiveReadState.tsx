import { AlertTriangle, Loader2 } from "lucide-react";
import { Card } from "@/components/dl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dedicated loading / error surface for the live rota. Shown instead of the
 * grid while a live workspace's reads settle, so the page never renders demo
 * staff or shifts and never looks "empty" or "all clear" prematurely.
 */
export function RotaLiveReadState({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  if (isError) {
    return (
      <Card className="p-8">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Your rota couldn't be loaded
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            We couldn't reach your workspace data, so nothing is shown rather than showing something
            wrong. Your rota is unchanged.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" aria-busy="true">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>Loading your workspace rota…</span>
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    </Card>
  );
}
