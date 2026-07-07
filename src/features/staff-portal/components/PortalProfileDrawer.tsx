import { Mail, Phone } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import type { PortalProfile } from "../types";

export function PortalProfileDrawer({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: PortalProfile | null | undefined;
}) {
  if (!profile) return null;
  const p = profile;
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Profile"
      description="Your details and manager contact"
      width="lg"
    >
      <div className="space-y-4">
        <DashboardCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center text-base font-semibold">
              {p.initials}
            </div>
            <div>
              <div className="text-base font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.role}</div>
              <div className="mt-1">
                <StatusBadge tone={p.accessStatus === "active" ? "success" : "warning"} dot>
                  Portal access · {p.accessStatus}
                </StatusBadge>
              </div>
            </div>
          </div>
        </DashboardCard>

        <FormSection title="Your details">
          <DetailRow label="Department" value={p.department} />
          <DetailRow label="Email" value={p.email} />
          <DetailRow label="Phone" value={p.phone} />
        </FormSection>

        <FormSection title="Manager contact">
          <DetailRow label="Name" value={p.manager.name} />
          <DetailRow label="Email" value={p.manager.email} />
          <DetailRow label="Phone" value={p.manager.phone} />
        </FormSection>

        <div className="flex gap-2">
          <ActionButton
            size="sm"
            variant="secondary"
            icon={Mail}
            onClick={() => (window.location.href = `mailto:${p.manager.email}`)}
          >
            Email manager
          </ActionButton>
          <ActionButton
            size="sm"
            variant="secondary"
            icon={Phone}
            onClick={() => (window.location.href = `tel:${p.manager.phone}`)}
          >
            Call
          </ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}
