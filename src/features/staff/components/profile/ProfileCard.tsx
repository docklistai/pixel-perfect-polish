import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "highlight" | "warning" | "quiet";

const VARIANT_STYLE: Record<CardVariant, React.CSSProperties> = {
  default: {},
  highlight: { backgroundColor: "var(--brand-soft)" },
  warning: { backgroundColor: "var(--warning-soft)" },
  quiet: { backgroundColor: "var(--muted)" },
};

interface ProfileCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  variant?: CardVariant;
}

export function ProfileCard({
  title,
  action,
  children,
  className,
  titleClassName,
  variant = "default",
}: ProfileCardProps) {
  return (
    <div className={cn("dock-card p-4", className)} style={VARIANT_STYLE[variant]}>
      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
            titleClassName,
          )}
        >
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 gap-3 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
        {children}
      </span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}

export function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3 min-w-[72px]">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums truncate">{value}</div>
    </div>
  );
}

type TileTone = "default" | "warning" | "danger";

const TILE_STYLE: Record<TileTone, React.CSSProperties> = {
  default: {},
  warning: { backgroundColor: "var(--warning-soft)" },
  danger: { backgroundColor: "var(--danger-soft)" },
};

interface CardTileProps {
  label: string;
  value: React.ReactNode;
  tone?: TileTone;
}

export function CardTile({ label, value, tone = "default" }: CardTileProps) {
  return (
    <div
      className="rounded-lg bg-muted/30 flex flex-col items-center justify-center px-2 py-3 text-center"
      style={TILE_STYLE[tone]}
    >
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
    </div>
  );
}
