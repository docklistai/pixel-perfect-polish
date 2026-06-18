import * as React from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { DataTable, StatusBadge, toneSoft, type Tone } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SettingsPrimitives";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";

const COLOUR_PRESETS: { tone: Tone; label: string }[] = [
  { tone: "brand", label: "Teal" },
  { tone: "info", label: "Blue" },
  { tone: "success", label: "Green" },
  { tone: "warning", label: "Amber" },
  { tone: "danger", label: "Red" },
  { tone: "purple", label: "Purple" },
  { tone: "muted", label: "Slate" },
];

const DEFAULT_DEPT_TONES: Record<string, Tone> = {
  "Front of House": "brand",
  Kitchen: "warning",
  Bar: "info",
  Housekeeping: "success",
  Maintenance: "danger",
};

const SHIFT_TEMPLATES = [
  { name: "Breakfast service", hours: "07:00 – 15:00", teams: "Front of House · Kitchen" },
  { name: "Evening service", hours: "16:00 – 00:00", teams: "Front of House · Kitchen · Bar" },
  { name: "Night porter", hours: "22:00 – 06:00", teams: "Maintenance" },
] as const;

export function TeamsTab({ onDirty }: { onDirty: () => void }) {
  const [deptTones, setDeptTones] = React.useState(DEFAULT_DEPT_TONES);
  const { workspaceName } = useManagerIdentity();

  const locations = [
    {
      location: workspaceName,
      team: "All departments",
      status: "Active",
      coverage: "Full week",
    },
  ];

  const setTone = (dept: string, tone: Tone) => {
    setDeptTones((prev) => ({ ...prev, [dept]: tone }));
    onDirty();
  };

  const resetAll = () => {
    setDeptTones(DEFAULT_DEPT_TONES);
    onDirty();
    toast.info("Department colours reset", {
      description: "All departments are back to their default palette.",
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Locations & teams
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The locations and departments your rota, staff list, and reports are organised around.
        </p>
      </div>

      <SectionCard
        title="Locations"
        description="Shown in rota views and used for team coverage summaries."
      >
        <DataTable
          columns={[
            { key: "location", header: "Location", render: (row) => row.location },
            { key: "team", header: "Team", render: (row) => row.team },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusBadge tone={row.status === "Active" ? "success" : "info"}>
                  {row.status}
                </StatusBadge>
              ),
            },
            { key: "coverage", header: "Coverage", render: (row) => row.coverage },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <RowActionMenu
                  triggerLabel={`Actions for ${row.location}`}
                  items={[
                    {
                      label: "Rename location",
                      onSelect: () =>
                        toast.info(`Rename ${row.location}`, {
                          description: "Location names update everywhere they appear.",
                        }),
                    },
                    {
                      label: "Edit coverage",
                      onSelect: () =>
                        toast.info(`Coverage for ${row.location}`, {
                          description: "Coverage windows drive the rota grid defaults.",
                        }),
                    },
                    { kind: "separator" },
                    {
                      label: row.status === "Active" ? "Pause location" : "Activate location",
                      onSelect: () => {
                        onDirty();
                        toast.success(
                          row.status === "Active"
                            ? `${row.location} paused`
                            : `${row.location} activated`,
                          { description: "Save changes to apply this to the rota." },
                        );
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
          rows={locations}
          rowKey={(row) => row.location}
        />
      </SectionCard>

      <SectionCard
        title="Department colours"
        description="Used on the rota grid, staff list, and reports so departments read at a glance."
      >
        <div className="space-y-2">
          {Object.entries(deptTones).map(([dept, tone]) => (
            <div
              key={dept}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-2.5 pl-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold",
                    toneSoft[tone],
                  )}
                >
                  {dept.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate text-sm font-medium">{dept}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                  >
                    {COLOUR_PRESETS.find((p) => p.tone === tone)?.label ?? "Custom"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="popover">
                  {COLOUR_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.tone}
                      className="menu-item"
                      onSelect={() => setTone(dept, preset.tone)}
                    >
                      <span className={cn("h-3 w-3 rounded-full", toneSoft[preset.tone])} />
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="mt-3 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/50"
        >
          Reset all to defaults
        </button>
      </SectionCard>

      <SectionCard
        title="Shift templates"
        description="Reusable start and end times for the most common shifts."
      >
        <div className="space-y-2">
          {SHIFT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Clock className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{tpl.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {tpl.hours} · {tpl.teams}
                  </div>
                </div>
              </div>
              <RowActionMenu
                triggerLabel={`Actions for ${tpl.name}`}
                items={[
                  {
                    label: "Edit template",
                    onSelect: () =>
                      toast.info(`Edit ${tpl.name}`, {
                        description: "Template changes apply to new shifts only.",
                      }),
                  },
                  {
                    label: "Use on this week's rota",
                    onSelect: () =>
                      toast.success(`${tpl.name} ready to place`, {
                        description: "Open the rota and click an empty cell to apply it.",
                      }),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
