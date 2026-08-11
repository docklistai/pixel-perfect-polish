import { DialogShell, ActionButton, StatusBadge } from "@/components/dl";
import { Gift, Check, Info, Megaphone } from "lucide-react";
import { StaffMonogram } from "@/features/staff/components/StaffMonogram";
import { formatBirthday } from "../lib/teamFormatting";
import type { TeamBirthday } from "../types";

interface Props {
  birthday: TeamBirthday | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: (staffMemberId: string, occurrenceYear: number) => Promise<boolean>;
  onComposeNote: () => void;
}

export function TeamBirthdayDialog({
  birthday,
  pending,
  onOpenChange,
  onAcknowledge,
  onComposeNote,
}: Props) {
  if (!birthday) return null;

  return (
    <DialogShell
      open
      onOpenChange={(open) => !open && onOpenChange(false)}
      icon={Gift}
      iconTone="purple"
      title={`${birthday.name}'s birthday`}
      description="Private manager reminder · not shared with staff automatically"
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            icon={Check}
            disabled={pending || birthday.acknowledged}
            onClick={() => void onAcknowledge(birthday.staffMemberId, birthday.occurrenceYear)}
          >
            {birthday.acknowledged ? "Acknowledged" : "Mark acknowledged"}
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <StaffMonogram name={birthday.name} size="lg" />
          <div>
            <div className="text-sm font-semibold text-foreground">{birthday.name}</div>
            <StatusBadge tone="purple" className="mt-1.5 inline-flex">
              {formatBirthday(birthday.birthDay, birthday.birthMonth)}
            </StatusBadge>
          </div>
        </div>

        <div className="p-3 bg-brand-soft/20 border border-brand/20 rounded-xl flex items-start gap-2.5">
          <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-foreground/80 leading-normal">
            This is a <strong>manager-only reminder</strong>. Nothing has been shared with{" "}
            {birthday.name}. Acknowledging it is private to your management team.
          </p>
        </div>

        <button
          type="button"
          onClick={onComposeNote}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all text-left group"
        >
          <div
            className="p-2 rounded-lg shrink-0 bg-accent-purple-soft text-accent-purple"
            aria-hidden
          >
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
              Write a team announcement
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
              Opens the composer — you choose what to send and to whom
            </div>
          </div>
        </button>
      </div>
    </DialogShell>
  );
}
