import { DataTable, DetailRow, StatusBadge, toneSoft, toneText } from "@/components/dl";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SettingsPrimitives";

export function TeamsTab({ onDirty }: { onDirty: () => void }) {
  const locations = [
    { location: "Main venue", team: "Front of House", status: "Active", coverage: "Full week" },
    { location: "Kitchen", team: "Kitchen", status: "Active", coverage: "Weeknights" },
    { location: "Bar", team: "Bar", status: "Active", coverage: "Weekends" },
    { location: "Events", team: "Events", status: "Preview", coverage: "Selected dates" },
    { location: "Housekeeping", team: "Housekeeping", status: "Active", coverage: "Early shifts" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Locations & teams
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visual only. Keep the team layout aligned with the rota and staff views.
        </p>
      </div>
      <SectionCard
        title="Location table"
        description="Shown in rota views and used as a preview of team coverage."
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
          ]}
          rows={locations}
          rowKey={(row) => row.location}
        />
      </SectionCard>

      <SectionCard
        title="Department colours"
        description="Local styling only. Mirrors the prototype palette."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Front of House", "brand"],
            ["Kitchen", "warning"],
            ["Bar", "info"],
            ["Events", "purple"],
            ["Housekeeping", "success"],
            ["Ops", "muted"],
          ].map(([label, tone]) => (
            <button
              key={label}
              type="button"
              onClick={onDirty}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left hover:bg-muted/30"
            >
              <span
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  toneSoft[tone as keyof typeof toneSoft],
                )}
              >
                <span
                  className={cn("text-xs font-semibold", toneText[tone as keyof typeof toneText])}
                >
                  {label.slice(0, 2).toUpperCase()}
                </span>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">Shown in location summaries.</div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Team note" description="Keep coverage language honest and short.">
        <div className="space-y-2">
          <DetailRow label="Main venue" value="Always visible" />
          <DetailRow label="Secondary areas" value="Shown as preview tags" />
          <DetailRow label="Dirty state" value="Local only" />
        </div>
      </SectionCard>
    </div>
  );
}
