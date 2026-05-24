/**
 * Frontend-only department colour foundation for the Rota grid.
 *
 * Maps shift roles → departments → colour presets using existing design tokens.
 * Conflict and open-shift overrides are applied by callers (ShiftCell), not here.
 *
 * Ready for future per-cell manual colour override: pass `colourOverride` to
 * resolveShiftChipClasses and it will short-circuit the dept lookup.
 */

export type DeptColourPreset = {
  id: string;
  /** Full Tailwind chip classes: background + border + text. Literal strings only — no interpolation. */
  chip: string;
  /** Tailwind class for a legend swatch dot. */
  swatch: string;
};

export const DEPT_COLOUR_PRESETS: Record<string, DeptColourPreset> = {
  blue: {
    id: "blue",
    chip: "bg-info-soft/70 border-info/25 text-foreground",
    swatch: "bg-info",
  },
  amber: {
    id: "amber",
    chip: "bg-warning-soft/70 border-warning/25 text-foreground",
    swatch: "bg-warning",
  },
  purple: {
    id: "purple",
    chip: "bg-accent-purple-soft/70 border-accent-purple/25 text-foreground",
    swatch: "bg-accent-purple",
  },
  green: {
    id: "green",
    chip: "bg-success-soft/70 border-success/25 text-foreground",
    swatch: "bg-success",
  },
  rose: {
    id: "rose",
    chip: "bg-danger-soft/70 border-danger/25 text-foreground",
    swatch: "bg-danger",
  },
  teal: {
    id: "teal",
    chip: "bg-brand-soft/70 border-brand/25 text-foreground",
    swatch: "bg-brand",
  },
  slate: {
    id: "slate",
    chip: "bg-muted border-border text-muted-foreground",
    swatch: "bg-muted-foreground",
  },
};

const DEPT_PRESET: Record<string, string> = {
  "front of house": "blue",
  foh: "blue",
  kitchen: "amber",
  bar: "purple",
  housekeeping: "green",
  events: "rose",
  maintenance: "slate",
  porter: "teal",
  management: "blue",
  open: "amber",
};

const ROLE_TO_DEPT: Record<string, string> = {
  manager: "management",
  supervisor: "management",
  "head chef": "kitchen",
  chef: "kitchen",
  "sous chef": "kitchen",
  "kitchen porter": "kitchen",
  bartender: "bar",
  barista: "bar",
  "bar manager": "bar",
  waiter: "front of house",
  waitress: "front of house",
  server: "front of house",
  host: "front of house",
  receptionist: "front of house",
  housekeeping: "housekeeping",
  housekeeper: "housekeeping",
  "room attendant": "housekeeping",
  porter: "porter",
  "night porter": "porter",
  events: "events",
  "events coordinator": "events",
  maintenance: "maintenance",
  "maintenance technician": "maintenance",
};

/**
 * Returns Tailwind chip classes for a shift's department colour.
 *
 * Conflict and open-shift styles take precedence over this — apply them in
 * the caller before this value is used.
 *
 * @param role   The shift's role string (e.g. "Head Chef", "Bartender").
 * @param colourOverride  Optional preset ID for future manual per-shift override.
 */
export function resolveShiftChipClasses(role: string, colourOverride?: string): string {
  if (colourOverride && DEPT_COLOUR_PRESETS[colourOverride]) {
    return DEPT_COLOUR_PRESETS[colourOverride]!.chip;
  }
  const roleKey = role.toLowerCase().trim();
  const dept = ROLE_TO_DEPT[roleKey] ?? roleKey;
  const presetId = DEPT_PRESET[dept] ?? DEPT_PRESET[roleKey] ?? "slate";
  return (DEPT_COLOUR_PRESETS[presetId] ?? DEPT_COLOUR_PRESETS.slate!).chip;
}
