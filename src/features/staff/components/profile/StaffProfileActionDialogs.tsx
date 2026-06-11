import { ActionButton, DialogShell } from "@/components/dl";
import type { StaffProfile } from "../../types";
import { AlertTriangle, Check, Edit2, Lock } from "lucide-react";

interface StaffProfileActionDialogsProps {
  profile: StaffProfile;
  editOpen: boolean;
  suspendOpen: boolean;
  onEditOpenChange: (open: boolean) => void;
  onSuspendOpenChange: (open: boolean) => void;
  onToast: (message: string) => void;
}

const departments = [
  "Front of House",
  "Kitchen",
  "Bar",
  "Events",
  "Housekeeping",
  "Maintenance",
  "Porter",
];

export function StaffProfileActionDialogs({
  profile,
  editOpen,
  suspendOpen,
  onEditOpenChange,
  onSuspendOpenChange,
  onToast,
}: StaffProfileActionDialogsProps) {
  const [firstName, ...lastNameParts] = profile.name.split(" ");

  function saveProfile() {
    onEditOpenChange(false);
    onToast("Profile updated");
  }

  function suspendProfile() {
    onSuspendOpenChange(false);
    onToast(`${profile.name} suspended`);
  }

  return (
    <>
      <DialogShell
        open={editOpen}
        onOpenChange={onEditOpenChange}
        title={`Edit ${profile.name}`}
        description="Update details and contract"
        icon={Edit2}
        size="lg"
        footer={
          <>
            <ActionButton variant="ghost" size="sm" onClick={() => onEditOpenChange(false)}>
              Cancel
            </ActionButton>
            <ActionButton size="sm" onClick={saveProfile}>
              <Check className="h-3 w-3" aria-hidden /> Save changes
            </ActionButton>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="profile-first-name">First name</label>
            <input id="profile-first-name" className="dl-input" defaultValue={firstName} />
          </div>
          <div className="field">
            <label htmlFor="profile-last-name">Last name</label>
            <input
              id="profile-last-name"
              className="dl-input"
              defaultValue={lastNameParts.join(" ")}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" className="dl-input mono" defaultValue={profile.email} />
          </div>
          <div className="field">
            <label htmlFor="profile-phone">Phone</label>
            <input id="profile-phone" className="dl-input mono" defaultValue={profile.phone} />
          </div>
          <div className="field">
            <label htmlFor="profile-role">Role</label>
            <input id="profile-role" className="dl-input" defaultValue={profile.role} />
          </div>
          <div className="field">
            <label htmlFor="profile-department">Department</label>
            <select id="profile-department" className="dl-select" defaultValue={profile.dept}>
              {departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="profile-contract">Contract</label>
            <select id="profile-contract" className="dl-select" defaultValue={profile.contract}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Zero-hours</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="profile-hours">Hours / week</label>
            <input
              id="profile-hours"
              className="dl-input mono"
              defaultValue={profile.contractedHours}
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="profile-start-date">Start date</label>
            <input
              id="profile-start-date"
              className="dl-input mono"
              defaultValue={profile.startDate}
            />
          </div>
        </div>
      </DialogShell>

      <DialogShell
        open={suspendOpen}
        onOpenChange={onSuspendOpenChange}
        title={`Suspend ${profile.name}?`}
        description="They'll lose access to the mobile portal and all shifts will be unassigned."
        icon={AlertTriangle}
        iconTone="danger"
        footer={
          <>
            <ActionButton variant="ghost" size="sm" onClick={() => onSuspendOpenChange(false)}>
              Cancel
            </ActionButton>
            <ActionButton variant="danger" size="sm" onClick={suspendProfile}>
              <Lock className="h-3 w-3" aria-hidden /> Suspend
            </ActionButton>
          </>
        }
      >
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold">3 shifts will be unassigned</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Tue 13, Wed 14, and Thu 11 Jun. The rota will be marked as draft and require
                re-publishing.
              </div>
            </div>
          </div>
        </div>
      </DialogShell>
    </>
  );
}
