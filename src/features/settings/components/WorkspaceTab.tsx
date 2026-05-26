import * as React from "react";
import { StatusBadge } from "@/components/dl";
import {
  DensityButton,
  FieldLabel,
  SectionCard,
  SelectField,
  TextField,
  ThemeChoiceCard,
  ToggleRow,
  useThemePreference,
  type DensityMode,
} from "./SettingsPrimitives";

export function WorkspaceTab({ onDirty }: { onDirty: () => void }) {
  const [theme, setTheme] = useThemePreference();
  const [density, setDensity] = React.useState<DensityMode>("comfortable");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">General</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace defaults that shape rota views, date formats, and manager preferences.
        </p>
      </div>

      <SectionCard
        title="Workspace basics"
        description="General settings used across the manager app."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <FieldLabel>Workspace name</FieldLabel>
            <TextField defaultValue="Harbour View Hotel" onChange={onDirty} />
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Default week start</FieldLabel>
            <SelectField defaultValue="monday" onChange={onDirty}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Time format</FieldLabel>
            <SelectField defaultValue="24h" onChange={onDirty}>
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Date format</FieldLabel>
            <SelectField defaultValue="dd-mmm-yyyy" onChange={onDirty}>
              <option value="dd-mmm-yyyy">DD MMM YYYY</option>
              <option value="dd-mm-yyyy">DD/MM/YYYY</option>
              <option value="mmm-dd-yyyy">MMM DD, YYYY</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Appearance"
        description="Light or dark mode for this device. Affects only this view."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ThemeChoiceCard
            mode="light"
            active={theme === "light"}
            onClick={() => {
              setTheme("light");
              onDirty();
            }}
          />
          <ThemeChoiceCard
            mode="dark"
            active={theme === "dark"}
            onClick={() => {
              setTheme("dark");
              onDirty();
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Density" description="How compact rows and tables appear.">
        <div className="flex flex-wrap gap-2">
          {(["compact", "comfortable", "spacious"] as DensityMode[]).map((option) => (
            <DensityButton
              key={option}
              label={option[0].toUpperCase() + option.slice(1)}
              active={density === option}
              onClick={() => {
                setDensity(option);
                onDirty();
              }}
            />
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-muted/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Preview row</div>
              <div className="text-xs text-muted-foreground">
                A small sample of how lists will breathe.
              </div>
            </div>
            <StatusBadge tone="info">{density}</StatusBadge>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-2.5 rounded-full bg-muted" />
            <div className="h-2.5 w-4/5 rounded-full bg-muted" />
            <div className="h-2.5 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Language & region"
        description="Shown in menus, dates, and export previews."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Language</FieldLabel>
            <SelectField defaultValue="en-gb" onChange={onDirty}>
              <option value="en-gb">English (UK)</option>
              <option value="en-us">English (US)</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Region</FieldLabel>
            <SelectField defaultValue="uk" onChange={onDirty}>
              <option value="uk">United Kingdom</option>
              <option value="ie">Ireland</option>
              <option value="us">United States</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>First day of week</FieldLabel>
            <SelectField defaultValue="monday" onChange={onDirty}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Manager preferences"
        description="Local preferences for draft rota review."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Keep unpublished changes visible"
            description="Draft edits stay highlighted while you review the week."
            ariaLabel="Keep unpublished changes visible"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show location labels in compact views"
            description="Use extra labels when tables become narrow."
            ariaLabel="Show location labels in compact views"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Highlight manager notes"
            description="Emphasise notes that need review before publishing."
            ariaLabel="Highlight manager notes"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>
    </div>
  );
}
