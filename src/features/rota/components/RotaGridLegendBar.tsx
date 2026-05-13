import { AlertTriangle, CircleAlert } from "lucide-react";

export function RotaGridLegendBar({ staffCount }: { staffCount: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
      <span>
        <span className="font-semibold text-foreground">{staffCount} staff members</span>
      </span>
      <span>Coverage target: 100%</span>
      <span>
        Breaks: 30 mins unpaid break for shifts over 6 hours{" "}
        <CircleAlert className="inline-block h-3 w-3 align-[-1px]" />
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1">— Break</span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-warning" /> Conflict
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-warning" />
          Open shift
        </span>
        <span>— Day off</span>
      </div>
    </div>
  );
}
