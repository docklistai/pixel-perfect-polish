import { ActionButton, DashboardCard } from "@/components/dl";

export function PortalRotaReadState({
  isLoading,
  isError,
  onRetry,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <DashboardCard className="p-4">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Loading your published rota…
        </p>
      </DashboardCard>
    );
  }
  if (!isError) return null;
  return (
    <DashboardCard className="p-4">
      <div role="alert">
        <p className="text-sm font-medium">Published rota unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">
          We couldn&apos;t verify your shifts. Try again before starting a new clock session.
        </p>
        <ActionButton variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </ActionButton>
      </div>
    </DashboardCard>
  );
}
