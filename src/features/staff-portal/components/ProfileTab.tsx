import { LogOut, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import { mockProfile } from "../data/mockPortalData";

export function ProfileTab() {
  const p = mockProfile;
  return (
    <div className="space-y-4">
      <DashboardCard className="p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="h-14 w-14 rounded-full bg-brand-soft text-brand flex items-center justify-center text-lg font-semibold"
          >
            {p.initials}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground truncate">{p.role}</div>
            <div className="mt-1">
              <StatusBadge tone={p.accessStatus === "active" ? "success" : "warning"} dot>
                Portal access · {p.accessStatus}
              </StatusBadge>
            </div>
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="p-5">
        <FormSection title="Your details">
          <DetailRow label="Department" value={p.department} />
          <DetailRow label="Email" value={p.email} />
          <DetailRow label="Phone" value={p.phone} />
        </FormSection>
      </DashboardCard>

      <DashboardCard className="p-5">
        <FormSection title="Manager contact">
          <DetailRow label="Name" value={p.manager.name} />
          <DetailRow
            label="Email"
            value={
              <a className="text-brand hover:underline" href={`mailto:${p.manager.email}`}>
                {p.manager.email}
              </a>
            }
          />
          <DetailRow
            label="Phone"
            value={
              <a className="text-brand hover:underline" href={`tel:${p.manager.phone}`}>
                {p.manager.phone}
              </a>
            }
          />
        </FormSection>
        <div className="mt-4 flex gap-2">
          <ActionButton
            size="sm"
            variant="secondary"
            icon={Mail}
            onClick={() => (window.location.href = `mailto:${p.manager.email}`)}
          >
            Email
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
      </DashboardCard>

      <ActionButton
        variant="ghost"
        icon={LogOut}
        onClick={() => toast.message("Signed out (mock)")}
        className="w-full md:w-auto"
      >
        Sign out
      </ActionButton>
    </div>
  );
}
