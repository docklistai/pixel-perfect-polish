import { DashboardCard, DrawerShell } from "@/components/dl";

/**
 * Honest read-only settings surface. The portal has no working account or
 * preference controls yet, so nothing here is rendered as an interactive
 * control that would silently do nothing.
 */
export function PortalSettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Settings"
      description="Account and app information"
      width="lg"
    >
      <div className="space-y-4">
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Account &amp; sign-in</div>
          <p className="mt-1 text-xs text-muted-foreground">
            You sign in with access codes issued by your manager. Password and sign-in settings are
            not available in the staff portal yet — ask your manager if you need your access reset.
          </p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">App preferences</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Notification and app preferences are not available yet.
          </p>
        </DashboardCard>
      </div>
    </DrawerShell>
  );
}
