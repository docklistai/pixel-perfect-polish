import * as React from "react";
import type { StaffProfile } from "../types";
import type { StaffRow } from "../types";

interface StaffPanelOverviewProps {
  member: StaffRow;
  profile: StaffProfile | null;
  employeeId: string;
  payRate: string;
  reportsTo: string;
}

export function StaffPanelOverview({
  member,
  profile,
  employeeId,
  payRate,
  reportsTo,
}: StaffPanelOverviewProps) {
  const fields: [string, string][] = [
    ["Employee ID", employeeId],
    ["Start date", profile?.startDate ?? "—"],
    ["Department", member.dept],
    ["Reports to", reportsTo],
    [
      "Contract",
      `${profile?.employmentType ?? member.contract} · ${profile?.contractedHours ?? "—"}`,
    ],
    ["Pay rate", payRate],
  ];

  return (
    <>
      {/* Key-value fields */}
      <dl className="space-y-0">
        {fields.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between items-baseline py-1.5 border-b border-border/40 last:border-0 gap-2"
          >
            <dt className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
              {k}
            </dt>
            <dd className="text-xs font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Skills */}
      <div className="pt-3 border-t border-border/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Skills
        </div>
        {profile?.skills?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium"
              >
                {s}
              </span>
            ))}
            {profile.skills.length > 5 && (
              <span className="text-[11px] text-brand font-medium">
                +{profile.skills.length - 5} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">No skills recorded</span>
        )}
      </div>
    </>
  );
}
