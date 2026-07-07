import { DashboardCard, DrawerShell } from "@/components/dl";
import type { PortalProfile } from "../types";

export function PortalHelpDrawer({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: PortalProfile | null | undefined;
}) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Help & support"
      description="Contact your manager"
      width="lg"
    >
      <div className="space-y-3">
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Need help?</div>
          <p className="text-xs text-muted-foreground mt-1">
            In-app guides are not available yet. For questions about shifts, leave, the time clock
            or notifications, contact your manager.
          </p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Contact your manager</div>
          <p className="text-xs text-muted-foreground mt-1">
            {profile?.manager.name ?? "Manager"}{" "}
            {profile?.manager.email ? `· ${profile.manager.email}` : ""}
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
