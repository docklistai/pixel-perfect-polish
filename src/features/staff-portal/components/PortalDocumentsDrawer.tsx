import { DashboardCard, DrawerShell } from "@/components/dl";

export function PortalDocumentsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Documents"
      description="Not available during the pilot."
      width="lg"
    >
      <div className="space-y-4">
        <DashboardCard className="p-5 text-center">
          <div className="text-sm font-semibold">Documents aren't available yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Document management is switched off for the pilot, so nothing can be uploaded, shared or
            stored here. Ask your manager for anything you need in the meantime.
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
