import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, Eye, Plane, ShieldOff, UserMinus } from "lucide-react";
import { RowActionMenu } from "@/components/RowActionMenu";
import { useIntents } from "@/lib/interactionIntents";
import { StaffMonogram } from "./StaffMonogram";
import type { StaffRow } from "../types";

interface StaffTableRowProps {
  row: StaffRow;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: () => void;
}

const STATUS_CLS: Record<string, string> = {
  Active: "bg-success-soft text-success",
  Probation: "bg-warning-soft text-warning",
  "On Leave": "bg-accent-purple-soft text-accent-purple",
};

const AVAIL_BAR: Record<string, string> = {
  high: "bg-success",
  med: "bg-warning",
  off: "bg-muted-foreground/30",
};

export function StaffTableRow({
  row: r,
  isSelected,
  isChecked,
  onSelect,
  onCheck,
}: StaffTableRowProps) {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();
  const pct = parseInt(r.avail, 10) || 0;

  const actions = [
    {
      label: "View profile",
      icon: Eye,
      onSelect: () => navigate({ to: "/staff/$staffId", params: { staffId: r.id } }),
    },
    {
      label: "Add a shift",
      icon: CalendarDays,
      onSelect: () => {
        navigate({ to: "/rota" });
        requestIntent("rota.addShift");
      },
    },
    {
      label: "Log leave",
      icon: Plane,
      onSelect: () => {
        navigate({ to: "/leave" });
        requestIntent("leave.new");
      },
    },
    { kind: "separator" as const },
    {
      label: "Suspend access",
      icon: ShieldOff,
      onSelect: () =>
        toast.info(`Suspend access for ${r.n}`, {
          description: "Suspend is a demo state in this prototype.",
        }),
    },
    {
      label: "Remove from team",
      icon: UserMinus,
      danger: true,
      onSelect: () =>
        toast.warning(`Remove ${r.n}`, {
          description: "Remove is disabled while this prototype runs frontend-only.",
        }),
    },
  ];

  return (
    <tr
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-selected={isSelected}
      className={`border-b border-border/60 last:border-0 cursor-pointer transition-colors ${
        isSelected ? "bg-[rgba(14,165,162,0.10)]" : "hover:bg-muted/40"
      }`}
    >
      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${r.n}`}
          checked={isChecked}
          onChange={onCheck}
          className="rounded border-border"
        />
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2.5">
          <StaffMonogram name={r.n} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{r.n}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">{r.e}</div>
          </div>
        </div>
      </td>
      <td className="py-3 text-sm">
        <div className="font-medium text-foreground">{r.role}</div>
        {r.sub && <div className="text-[11px] text-muted-foreground">{r.sub}</div>}
      </td>
      <td className="py-3 text-sm text-muted-foreground">{r.dept}</td>
      <td className="py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_CLS[r.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden />
          {r.status}
        </span>
      </td>
      <td className="py-3 text-sm">
        <div className="font-medium text-foreground">{r.contract}</div>
        <div className="text-[11px] text-muted-foreground">{r.hours}</div>
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 max-w-[90px] h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${AVAIL_BAR[r.availTone] ?? "bg-muted-foreground/30"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground w-7">
            {r.avail}
          </span>
        </div>
      </td>
      <td className="py-3 text-right pr-3" onClick={(e) => e.stopPropagation()}>
        <RowActionMenu triggerLabel={`Actions for ${r.n}`} items={actions} />
      </td>
    </tr>
  );
}
