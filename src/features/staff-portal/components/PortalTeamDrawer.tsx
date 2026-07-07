import { DashboardCard, DrawerShell } from "@/components/dl";

/**
 * Honest placeholder: the staff portal only reads the signed-in member's own
 * published shifts, so there is no staff-safe team-on-shift data to show yet.
 */
export function PortalTeamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Team"
      description="Team information for your workspace"
      width="lg"
    >
      <div className="space-y-4">
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Team on shift is not available yet</div>
          <p className="mt-1 text-xs text-muted-foreground">
            The staff portal shows only your own published shifts for now. Ask your manager who else
            is working today.
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
