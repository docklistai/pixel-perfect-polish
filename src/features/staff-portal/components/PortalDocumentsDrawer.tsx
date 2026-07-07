import { DashboardCard, DrawerShell } from "@/components/dl";

export function PortalDocumentsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Documents"
      description="Read-only document preview."
      width="lg"
    >
      <div className="space-y-4">
        <DashboardCard className="p-5 text-center">
          <div className="text-sm font-semibold">No documents yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your required documents and certificates will appear here once uploaded by a manager.
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
