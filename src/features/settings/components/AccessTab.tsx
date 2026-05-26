import { DataTable, DetailRow, StatusBadge } from "@/components/dl";
import { SectionCard, ToggleRow } from "./SettingsPrimitives";

export function AccessTab({ onDirty }: { onDirty: () => void }) {
  const rows = [
    { role: "General manager", publish: "Yes", edit: "Yes", review: "Yes" },
    { role: "Duty manager", publish: "Preview", edit: "Yes", review: "Yes" },
    { role: "Team lead", publish: "No", edit: "Drafts", review: "No" },
    { role: "Staff", publish: "No", edit: "Own shifts", review: "No" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Roles & permissions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Frontend-only role summaries so managers can review who can see what.
        </p>
      </div>

      <SectionCard
        title="Access overview"
        description="A simple role matrix for the manager app preview."
      >
        <DataTable
          columns={[
            { key: "role", header: "Role", render: (row) => row.role },
            {
              key: "publish",
              header: "Publish rota",
              render: (row) => (
                <StatusBadge
                  tone={
                    row.publish === "Yes" ? "success" : row.publish === "Preview" ? "info" : "muted"
                  }
                >
                  {row.publish}
                </StatusBadge>
              ),
            },
            { key: "edit", header: "Edit drafts", render: (row) => row.edit },
            { key: "review", header: "Review notes", render: (row) => row.review },
          ]}
          rows={rows}
          rowKey={(row) => row.role}
        />
      </SectionCard>

      <SectionCard title="Manager note" description="Keep access descriptions honest and simple.">
        <div className="space-y-2">
          <DetailRow label="Workspace access" value="Managers and owners" />
          <DetailRow label="Draft visibility" value="Managers only" />
          <DetailRow label="Staff view" value="Published rota and personal shifts" />
        </div>
        <div className="mt-4">
          <ToggleRow
            label="Show access matrix in preview"
            description="Surface the role table in the local preview rail."
            ariaLabel="Show access matrix in preview"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>
    </div>
  );
}
