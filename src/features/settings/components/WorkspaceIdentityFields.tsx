import * as React from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { FieldLabel, TextField, SelectField } from "./SettingsPrimitives";
import { useUpdateWorkspaceName } from "../hooks/useUpdateWorkspaceName";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";

const WEEKDAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Common timezones for UK/IE-first hospitality; the stored value is always kept. */
const COMMON_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Lisbon",
  "UTC",
];

/** Live business-name editor (updates workspaces.name; refreshes the whole shell). */
export function WorkspaceNameField() {
  const nameEditor = useUpdateWorkspaceName();
  const [value, setValue] = React.useState<string | null>(null);
  const current = value ?? nameEditor.currentName;
  const dirty =
    value !== null && value.trim() !== nameEditor.currentName && value.trim().length > 0;

  const handleSave = async () => {
    const result = await nameEditor.save(current.trim());
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setValue(null);
    toast.success("Workspace name saved");
  };

  return (
    <div className="flex-1 space-y-1.5 sm:ml-4">
      <FieldLabel>Business name</FieldLabel>
      <div className="flex items-center gap-2">
        <TextField
          value={current}
          disabled={!nameEditor.enabled}
          maxLength={120}
          onChange={(event) => setValue(event.target.value)}
        />
        <ActionButton
          size="sm"
          onClick={() => void handleSave()}
          disabled={!nameEditor.enabled || !dirty || nameEditor.isSaving}
        >
          Save
        </ActionButton>
      </div>
    </div>
  );
}

/** Live primary-location name editor. */
export function WorkspaceLocationField() {
  const profile = useWorkspaceProfile();
  const location = profile.primaryLocation;
  const [value, setValue] = React.useState<string | null>(null);
  const current = value ?? location?.name ?? "";
  const dirty =
    value !== null && value.trim().length > 0 && value.trim() !== (location?.name ?? "");
  const editable = profile.enabled && location !== null;

  const handleSave = async () => {
    if (!location) return;
    const result = await profile.saveLocationName(location.id, current.trim());
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setValue(null);
    toast.success("Location saved");
  };

  return (
    <label className="space-y-1.5">
      <FieldLabel>Location</FieldLabel>
      <div className="flex items-center gap-2">
        <TextField
          value={current}
          disabled={!editable}
          maxLength={120}
          placeholder={editable ? "e.g. Harbour View, Brighton" : "No location yet"}
          onChange={(event) => setValue(event.target.value)}
        />
        <ActionButton
          size="sm"
          onClick={() => void handleSave()}
          disabled={!editable || !dirty || profile.isSaving}
        >
          Save
        </ActionButton>
      </div>
    </label>
  );
}

/** Live rota start day — the first weekday of every rota week. Locked once rotas exist. */
export function WorkspaceRotaStartDayField() {
  const profile = useWorkspaceProfile();
  const editable = profile.enabled && !profile.hasRotas;

  const handleChange = async (value: number) => {
    if (value === profile.rotaStartWeekday) return;
    const result = await profile.saveRotaStartDay(value);
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    toast.success("Rota start day saved", { description: "New rota weeks begin on this day." });
  };

  return (
    <label className="space-y-1.5">
      <FieldLabel>Rota starts on</FieldLabel>
      <SelectField
        value={String(profile.rotaStartWeekday)}
        disabled={!editable || profile.isSaving}
        onChange={(event) => void handleChange(Number(event.target.value))}
      >
        {WEEKDAY_OPTIONS.map((label, index) => (
          <option key={label} value={index}>
            {label}
          </option>
        ))}
      </SelectField>
      {profile.enabled && profile.hasRotas && (
        <p className="text-[11px] text-muted-foreground">
          Locked — you&apos;ve already built rotas. Set this during first-run setup.
        </p>
      )}
    </label>
  );
}

/** Live location time zone — drives shift times across the rota and staff portal. */
export function WorkspaceTimezoneField() {
  const profile = useWorkspaceProfile();
  const location = profile.primaryLocation;
  const editable = profile.enabled && location !== null;
  const current = location?.timezone ?? "Europe/London";
  const options = COMMON_TIMEZONES.includes(current)
    ? COMMON_TIMEZONES
    : [current, ...COMMON_TIMEZONES];

  const handleChange = async (timezone: string) => {
    if (!location || timezone === location.timezone) return;
    const result = await profile.saveLocationTimezone(location.id, timezone);
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    toast.success("Time zone saved", {
      description: "Shift times across the rota and staff portal use this zone.",
    });
  };

  return (
    <label className="space-y-1.5">
      <FieldLabel>Time zone</FieldLabel>
      <SelectField
        value={current}
        disabled={!editable || profile.isSaving}
        onChange={(event) => void handleChange(event.target.value)}
      >
        {options.map((timezone) => (
          <option key={timezone} value={timezone}>
            {timezone}
          </option>
        ))}
      </SelectField>
    </label>
  );
}
