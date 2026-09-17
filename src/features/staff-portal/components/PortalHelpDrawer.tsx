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
      description="Staff contact"
      width="lg"
    >
      <div className="space-y-3">
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Need help?</div>
          <p className="text-xs text-muted-foreground mt-1">
            In-app guides are not available yet. For questions about shifts, leave, the time clock
            or notifications, reach out to your workspace staff contact.
          </p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Staff contact</div>
          <p className="text-xs text-muted-foreground mt-1">
            {profile?.staffContact.name
              ? `${profile.staffContact.name}${profile.staffContact.email ? ` · ${profile.staffContact.email}` : ""}${profile.staffContact.phone ? ` · ${profile.staffContact.phone}` : ""}`
              : "No workspace staff contact recorded."}
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
