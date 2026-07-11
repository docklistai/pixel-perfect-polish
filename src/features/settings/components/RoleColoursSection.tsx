import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { SectionCard, FieldLabel, TextField, PreviewTag } from "./SettingsPrimitives";
import { useRoleColours } from "../hooks/useRoleColours";
import { COLOUR_PRESETS, type ColourPreset } from "../api/roleColours";
import { DEPT_COLOUR_PRESETS } from "@/features/rota/lib/deptColours";

function SwatchPicker({
  value,
  disabled,
  onPick,
}: {
  value: ColourPreset | null;
  disabled: boolean;
  onPick: (preset: ColourPreset) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {COLOUR_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          disabled={disabled}
          aria-label={`${preset} colour`}
          aria-pressed={value === preset}
          onClick={() => onPick(preset)}
          className={`h-6 w-6 rounded-full ${DEPT_COLOUR_PRESETS[preset]!.swatch} transition disabled:opacity-40 ${
            value === preset
              ? "ring-2 ring-offset-1 ring-brand ring-offset-background"
              : "opacity-70 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Optional per-role colours for the rota grid — true role-based colours managers
 * choose, overriding the built-in department palette. Live for manager workspaces.
 */
export function RoleColoursSection() {
  const live = useRoleColours();
  const [role, setRole] = React.useState("");
  const [preset, setPreset] = React.useState<ColourPreset | null>(null);

  const handleAdd = async () => {
    const trimmedRole = role.trim();
    if (trimmedRole.length === 0 || preset === null) {
      toast.error("Pick a role and colour", { description: "Enter a role and choose a colour." });
      return;
    }
    const result = await live.save({ roleName: trimmedRole, colourPreset: preset });
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setRole("");
    setPreset(null);
    toast.success("Role colour saved");
  };

  const recolour = async (roleName: string, colourPreset: ColourPreset) => {
    const result = await live.save({ roleName, colourPreset });
    if (!result.ok) toast.error("Not saved", { description: result.message });
  };

  return (
    <SectionCard
      title="Role colours"
      badge={
        live.enabled ? (
          <PreviewTag>Live — drives Rota</PreviewTag>
        ) : (
          <PreviewTag>Preview in demo mode</PreviewTag>
        )
      }
      description="Give each role its own colour on the rota grid. Overrides the default department palette."
    >
      {live.enabled && live.colours.length > 0 && (
        <ul className="mb-3 space-y-2">
          {live.colours.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">{entry.roleName}</span>
              <div className="flex shrink-0 items-center gap-3">
                <SwatchPicker
                  value={entry.colourPreset}
                  disabled={live.isSaving}
                  onPick={(next) => void recolour(entry.roleName, next)}
                />
                <button
                  type="button"
                  onClick={() => void live.remove(entry.id)}
                  aria-label={`Remove ${entry.roleName} colour`}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-danger-soft/40 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[140px] flex-1 space-y-1.5">
          <FieldLabel>Role</FieldLabel>
          <TextField
            value={role}
            disabled={!live.enabled}
            placeholder="e.g. Waiter"
            onChange={(event) => setRole(event.target.value)}
          />
        </label>
        <div className="space-y-1.5">
          <FieldLabel>Colour</FieldLabel>
          <SwatchPicker value={preset} disabled={!live.enabled} onPick={setPreset} />
        </div>
        <ActionButton
          icon={Plus}
          onClick={() => void handleAdd()}
          disabled={!live.enabled || live.isSaving}
        >
          Add
        </ActionButton>
      </div>
      {!live.enabled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Demo workspace — role colours are shown for preview and are not saved.
        </p>
      )}
    </SectionCard>
  );
}
