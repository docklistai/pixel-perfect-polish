import * as React from "react";
import { Check, MapPin, MessageSquare, User, Users } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import type { PortalShift } from "../types";

export function ShiftDetailDrawer({
  shift,
  onClose,
}: {
  shift: PortalShift | null;
  onClose: () => void;
}) {
  const [acknowledged, setAcknowledged] = React.useState(false);
  React.useEffect(() => {
    setAcknowledged(false);
  }, [shift?.id]);

  if (!shift) {
    return (
      <DrawerShell open={false} onOpenChange={() => onClose()} title="">
        <></>
      </DrawerShell>
    );
  }

  const isChanged = shift.status === "changed";
  const tasksDone = shift.tasks?.filter((t) => t.done).length ?? 0;
  const tasksTotal = shift.tasks?.length ?? 0;

  return (
    <DrawerShell
      open={!!shift}
      onOpenChange={(open) => !open && onClose()}
      title="Shift detail"
      description={shift.dayLabel}
      width="lg"
      footer={
        isChanged && !acknowledged ? (
          <ActionButton onClick={() => setAcknowledged(true)} className="w-full justify-center">
            Acknowledge shift change
          </ActionButton>
        ) : (
          <ActionButton variant="secondary" onClick={onClose} className="w-full justify-center">
            Close
          </ActionButton>
        )
      }
    >
      <div className="space-y-4">
        <DashboardCard className="p-4">
          <div className="flex items-center justify-between">
            <StatusBadge tone={isChanged ? "warning" : "success"}>
              {isChanged ? "Changed" : "Scheduled"}
            </StatusBadge>
            <span className="text-[11px] text-muted-foreground">
              {shift.hours}h · {shift.breakMinutes}m break
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {shift.start} – {shift.end}
          </div>
        </DashboardCard>

        <FormSection title="Details">
          <DetailRow label="Role" value={shift.role} />
          <DetailRow
            label="Location"
            value={
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {shift.station}
              </span>
            }
          />
          {shift.managerName && (
            <DetailRow
              label="Manager"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {shift.managerName}
                </span>
              }
            />
          )}
        </FormSection>

        {shift.shiftNote && (
          <DashboardCard className="p-4">
            <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> SHIFT NOTE
            </div>
            <p className="mt-2 text-sm">{shift.shiftNote}</p>
          </DashboardCard>
        )}

        {shift.tasks && shift.tasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
                TASKS
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tasksDone}/{tasksTotal} complete
              </div>
            </div>
            <ul className="space-y-1.5">
              {shift.tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <span
                    className={
                      "h-4 w-4 rounded-full flex items-center justify-center " +
                      (t.done
                        ? "bg-success text-success-foreground"
                        : "border border-border bg-muted")
                    }
                  >
                    {t.done && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className={t.done ? "text-muted-foreground line-through" : ""}>
                    {t.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {shift.teammates && shift.teammates.length > 0 && (
          <DashboardCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> TEAMMATES ON SHIFT ({shift.teammates.length})
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {shift.teammates.map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-1 w-[64px] text-center">
                  <div className="h-10 w-10 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-semibold">
                    {m.initials}
                  </div>
                  <div className="text-[11px] font-medium leading-tight truncate w-full">
                    {m.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                    {m.role}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        {isChanged && acknowledged && (
          <div className="text-center text-xs text-success font-medium">Changes acknowledged</div>
        )}
      </div>
    </DrawerShell>
  );
}
