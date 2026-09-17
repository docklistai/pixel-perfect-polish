import * as React from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { FieldLabel, SectionCard, TextField } from "./SettingsPrimitives";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";

export function StaffContactSection() {
  const profile = useWorkspaceProfile();
  const contact = profile.staffContact;

  const [name, setName] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState<string | null>(null);

  const currentName = name ?? contact?.name ?? "";
  const currentEmail = email ?? contact?.email ?? "";
  const currentPhone = phone ?? contact?.phone ?? "";

  const dirty =
    (name !== null && name !== (contact?.name ?? "")) ||
    (email !== null && email !== (contact?.email ?? "")) ||
    (phone !== null && phone !== (contact?.phone ?? ""));

  const handleSave = async () => {
    const result = await profile.saveStaffContact({
      name: currentName.trim(),
      email: currentEmail.trim(),
      phone: currentPhone.trim(),
    });

    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }

    setName(null);
    setEmail(null);
    setPhone(null);
    toast.success("Staff contact saved", {
      description: "Team members will see this contact in their portal profile and help drawer.",
    });
  };

  return (
    <SectionCard
      title="Staff contact"
      description="The primary contact shown to team members in their staff portal."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1.5">
          <FieldLabel>Contact name</FieldLabel>
          <TextField
            value={currentName}
            disabled={!profile.enabled}
            maxLength={120}
            placeholder="e.g. Alex Thompson or Duty Manager"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <FieldLabel>Email</FieldLabel>
          <TextField
            type="email"
            value={currentEmail}
            disabled={!profile.enabled}
            maxLength={255}
            placeholder="e.g. manager@workspace.co.uk"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <FieldLabel>Phone (optional)</FieldLabel>
          <TextField
            type="tel"
            value={currentPhone}
            disabled={!profile.enabled}
            maxLength={40}
            placeholder="e.g. +44 20 7946 0123"
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <ActionButton
          size="sm"
          onClick={() => void handleSave()}
          disabled={!profile.enabled || !dirty || profile.isSaving}
        >
          Save contact
        </ActionButton>
      </div>
    </SectionCard>
  );
}
