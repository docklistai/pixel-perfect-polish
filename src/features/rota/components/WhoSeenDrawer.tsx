import { Bell, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, DrawerShell, IconButton, StatusBadge } from "@/components/dl";
import type { StaffMember } from "../types";

/** "Who's seen this rota" drawer — prototype published-banner flow, demo data only. */
export function WhoSeenDrawer({
  open,
  onOpenChange,
  weekLabel,
  staff,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  staff: StaffMember[];
}) {
  const viewedCount = Math.max(1, staff.length - 2);
  const viewed = staff.slice(0, viewedCount);
  const notViewed = staff.slice(viewedCount);

  const prepareReminder = (name?: string) =>
    toast.info("Reminder prepared", {
      description: name
        ? `${name} will see a reminder in the app next time they open it.`
        : "Non-viewers will see a reminder in the app next time they open it.",
    });

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Who's seen this rota"
      description={`Week of ${weekLabel} · Published to ${staff.length} staff`}
      footer={
        <>
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton variant="secondary" size="sm" icon={Bell} onClick={() => prepareReminder()}>
            Remind non-viewers
          </ActionButton>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-3 rounded-[10px] border border-success/25 bg-success-soft/50 p-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
          aria-hidden
        >
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-success">
            {viewed.length} of {staff.length} staff viewed
          </div>
          <div className="text-xs text-muted-foreground">
            Staff see the published snapshot in the app
          </div>
        </div>
      </div>

      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Confirmed viewers
      </div>
      <div className="space-y-1">
        {viewed.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-[8px] bg-muted/40 px-3 py-2"
          >
            <img
              src={`https://i.pravatar.cc/64?img=${member.img}`}
              alt=""
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{member.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{member.role}</div>
            </div>
            <StatusBadge tone="success">
              <Check className="h-2.5 w-2.5" aria-hidden /> Viewed
            </StatusBadge>
          </div>
        ))}
      </div>

      {notViewed.length > 0 && (
        <>
          <div className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Not yet viewed
          </div>
          <div className="space-y-1">
            {notViewed.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-[8px] bg-muted/40 px-3 py-2"
              >
                <img
                  src={`https://i.pravatar.cc/64?img=${member.img}`}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{member.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{member.role}</div>
                </div>
                <IconButton
                  icon={Bell}
                  label={`Prepare reminder for ${member.name}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => prepareReminder(member.name)}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </DrawerShell>
  );
}
