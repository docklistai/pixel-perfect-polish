import * as React from "react";
import { toast } from "sonner";
import {
  DensityButton,
  FieldLabel,
  SectionCard,
  SelectField,
  ThemeChoiceCard,
  useThemePreference,
  type DensityMode,
} from "./SettingsPrimitives";

export function GeneralTab({ onDirty }: { onDirty: () => void }) {
  const [theme, setTheme] = useThemePreference();
  const [density, setDensity] = React.useState<DensityMode>("comfortable");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">General</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Personal preferences that apply only to your account.
        </p>
      </div>

      <SectionCard
        title="Appearance"
        description="Light or dark mode for this device. Affects only your view."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ThemeChoiceCard
            mode="light"
            active={theme === "light"}
            onClick={() => {
              setTheme("light");
              toast.success("Switched to light mode");
              onDirty();
            }}
          />
          <ThemeChoiceCard
            mode="dark"
            active={theme === "dark"}
            onClick={() => {
              setTheme("dark");
              toast.success("Switched to dark mode");
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
            <FieldLabel>Date format</FieldLabel>
            <SelectField defaultValue="dd-mmm-yyyy" onChange={onDirty}>
              <option value="dd-mmm-yyyy">DD MMM YYYY</option>
              <option value="dd-mm-yyyy">DD/MM/YYYY</option>
              <option value="mmm-dd-yyyy">MMM DD, YYYY</option>
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
    </div>
  );
}
