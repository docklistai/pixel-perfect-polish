/**
 * Docklist desktop UI system.
 *
 * Single source of truth for the building blocks used across the manager app.
 * Each component is a thin, presentational wrapper over the same Tailwind
 * patterns that have evolved organically across the routes — they are extracted
 * here so that buttons, badges, cards, filters, tables and panels stay
 * visually consistent across every page.
 *
 * Visual tokens come from src/styles.css. Do NOT introduce raw hex colours in
 * pages — pick a tone from the supported set instead.
 */
import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Building2,
  Search,
  AlertTriangle,
  Inbox,
  Loader2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "./layout/Sidebar";
import { Topbar } from "./layout/Topbar";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export type Tone = "brand" | "info" | "success" | "warning" | "danger" | "purple" | "muted";

/** Background + foreground pair for soft tone surfaces (badges, icon chips). */
export const toneSoft: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  purple: "bg-accent-purple-soft text-accent-purple",
  muted: "bg-muted text-muted-foreground",
};

/** Plain text colour per tone — used for inline labels and deltas. */
export const toneText: Record<Tone, string> = {
  brand: "text-brand",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  purple: "text-accent-purple",
  muted: "text-muted-foreground",
};

/* ------------------------------------------------------------------ */
/* AppShell, Topbar, Sidebar                                           */
/* ------------------------------------------------------------------ */

export { Sidebar, Topbar };

export function AppShell({
  children,
  searchPlaceholder,
}: {
  children: React.ReactNode;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 px-8 py-7">{children}</main>
        <footer className="px-8 py-5 text-center text-xs text-muted-foreground">
          All times shown in Europe/London (GMT+1)
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                          */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap justify-end">{actions}</div>}
    </div>
  );
}

/** Compact section heading used inside cards and panels. */
export function SectionHeader({
  eyebrow,
  title,
  count,
  action,
  className = "",
}: {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  count?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-center gap-2">
        {eyebrow && (
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">
            {eyebrow}
          </span>
        )}
        {title && <span className="text-sm font-semibold">{title}</span>}
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      {action && <div className="text-xs">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/** Base card surface — used by every card-shaped block in the app. */
export function DashboardCard({
  className = "",
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

// Backwards-compat alias for routes that still import { Card }.
export const Card = DashboardCard;

/** Headline metric tile — large value, supporting label and optional delta. */
export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "info",
  delta,
  deltaTone,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  delta?: React.ReactNode;
  deltaTone?: "success" | "danger" | "muted";
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <DashboardCard className={cn("p-4", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              toneSoft[tone],
            )}
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {(sub || delta) && (
        <div className="text-xs text-muted-foreground mt-1">
          {sub}
          {delta && (
            <span
              className={cn(
                "ml-1 font-semibold",
                deltaTone === "success" && "text-success",
                deltaTone === "danger" && "text-danger",
                deltaTone === "muted" && "text-muted-foreground",
              )}
            >
              {delta}
            </span>
          )}
        </div>
      )}
      {action && <div className="mt-3">{action}</div>}
    </DashboardCard>
  );
}

/** Compact card used in the Quick Actions stack on Home. */
export function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  href,
  tone = "brand",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  tone?: Tone;
}) {
  const inner = (
    <>
      <div
        className={cn("h-8 w-8 rounded-lg flex items-center justify-center", toneSoft[tone])}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-[11px] text-muted-foreground">{description}</div>}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    </>
  );
  const cls =
    "w-full flex items-center gap-3 rounded-xl border border-border p-2.5 text-left hover:bg-muted/40 transition";
  if (href) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ActionVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ActionSize = "sm" | "md";

const actionBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const actionVariants: Record<ActionVariant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-95 shadow-sm",
  secondary: "bg-card border border-border text-foreground hover:bg-muted/50",
  outline: "border border-brand text-brand hover:bg-brand-soft",
  ghost: "text-foreground hover:bg-muted/50",
  danger: "bg-danger text-white hover:opacity-95",
};

const actionSizes: Record<ActionSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm font-semibold",
};

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

/** Primary text-bearing button used in headers, modals and forms. */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton(
    {
      variant = "primary",
      size = "md",
      icon: Icon,
      iconRight: IconRight,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(actionBase, actionVariants[variant], actionSizes[size], className)}
        {...rest}
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
        {children}
        {IconRight && <IconRight className="h-4 w-4" aria-hidden />}
      </button>
    );
  },
);

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required — accessible name for screen readers. */
  label: string;
  variant?: "card" | "ghost" | "outline";
  size?: "sm" | "md";
}

/** Square icon-only button with mandatory aria-label. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "card", size = "md", className, ...rest },
  ref,
) {
  const sizeCls = size === "sm" ? "p-1.5" : "p-2.5";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const variantCls =
    variant === "card"
      ? "rounded-xl border border-border bg-card shadow-[var(--shadow-card)] hover:bg-muted/50"
      : variant === "outline"
        ? "rounded-lg border border-border hover:bg-muted/50"
        : "rounded-lg hover:bg-muted/50 text-muted-foreground";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        sizeCls,
        variantCls,
        className,
      )}
      {...rest}
    >
      <Icon className={iconSize} aria-hidden />
    </button>
  );
});

/** Pill-style filter trigger ("All teams ▾"). */
export function FilterButton({
  label,
  icon: Icon,
  active = false,
  className,
  onClick,
  showCaret = true,
}: {
  label: React.ReactNode;
  icon?: LucideIcon;
  active?: boolean;
  className?: string;
  onClick?: () => void;
  showCaret?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs flex items-center gap-2 transition-colors",
        active
          ? "border-brand text-brand bg-brand-soft"
          : "border-border bg-card hover:bg-muted/50",
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      <span>{label}</span>
      {showCaret && <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

/** Small status pill — solid soft-tone background. */
export function StatusBadge({
  tone = "muted",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
        toneSoft[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  /** Visual size; matches the sidebar/topbar versions. */
  variant?: "card" | "inline";
}

/** Text search input with leading magnifier icon. */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { containerClassName, variant = "inline", placeholder = "Search...", className, ...rest },
    ref,
  ) {
    const wrapper =
      variant === "card"
        ? "flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 shadow-[var(--shadow-card)]"
        : "flex items-center gap-2 rounded-lg border border-border px-3 py-1.5";
    return (
      <div className={cn(wrapper, containerClassName)}>
        <Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            variant === "card" ? "text-sm" : "text-xs",
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<Row> {
  key: string;
  header: React.ReactNode;
  /** Right-align numeric/status columns. */
  align?: "left" | "right" | "center";
  width?: string;
  className?: string;
  render: (row: Row, index: number) => React.ReactNode;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => React.Key;
  rowClassName?: (row: Row, index: number) => string | undefined;
  empty?: React.ReactNode;
  loading?: boolean;
  caption?: React.ReactNode;
  className?: string;
}

/**
 * Consistent sortable-looking table with the Docklist header style.
 * Keep usage thin — feed it ready-rendered cells, not data shapes.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowClassName,
  empty,
  loading,
  caption,
  className,
}: DataTableProps<Row>) {
  return (
    <div className={cn("w-full", className)}>
      <table className="w-full text-sm">
        {caption && (
          <caption className="text-left text-xs text-muted-foreground pb-2">{caption}</caption>
        )}
        <thead>
          <tr className="text-[11px] font-semibold tracking-widest text-muted-foreground border-y border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "py-2.5 px-2",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.align !== "right" && c.align !== "center" && "text-left",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="py-10">
                <LoadingState compact />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-10">
                {empty ?? <EmptyState compact title="No results" />}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={cn("border-b border-border/60 last:border-0", rowClassName?.(row, i))}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "py-3 px-2",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                    )}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/** Reusable "1 / 2 / 3 / >" pager. */
export function TablePagination({
  page = 1,
  pages = 1,
  rangeLabel,
  pageSizeLabel = "10 per page",
  onChange,
}: {
  page?: number;
  pages?: number;
  rangeLabel?: React.ReactNode;
  pageSizeLabel?: React.ReactNode;
  onChange?: (page: number) => void;
}) {
  const items = Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5);
  return (
    <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
      <span>{rangeLabel}</span>
      <div className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          variant="outline"
          size="sm"
          onClick={() => onChange?.(Math.max(1, page - 1))}
        />
        {items.map((p) => (
          <button
            key={p}
            onClick={() => onChange?.(p)}
            className={cn(
              "h-7 w-7 rounded-md text-xs",
              p === page ? "bg-primary text-primary-foreground" : "border border-border",
            )}
          >
            {p}
          </button>
        ))}
        <IconButton
          icon={ChevronRight}
          label="Next page"
          variant="outline"
          size="sm"
          onClick={() => onChange?.(Math.min(pages, page + 1))}
        />
      </div>
      <button className="rounded-md border border-border px-2 py-1 flex items-center gap-1">
        {pageSizeLabel} <ChevronDown className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Right-side panel (drawers / inspectors)                              */
/* ------------------------------------------------------------------ */

export function RightPanel({
  title,
  onClose,
  children,
  className,
}: {
  title?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DashboardCard className={cn("p-5 self-start", className)}>
      {(title || onClose) && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">{title}</div>
          {onClose && (
            <IconButton icon={X} label="Close panel" variant="ghost" size="sm" onClick={onClose} />
          )}
        </div>
      )}
      {children}
    </DashboardCard>
  );
}

/* ------------------------------------------------------------------ */
/* Notices: Alert / Empty / Loading / Error                            */
/* ------------------------------------------------------------------ */

export function AlertCard({
  title,
  description,
  tone = "warning",
  icon: Icon = AlertTriangle,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-border p-3", className)}>
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          toneSoft[tone],
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {action ?? <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 gap-2" : "py-12 gap-3",
      )}
    >
      <div
        className={cn(
          "rounded-full bg-muted text-muted-foreground flex items-center justify-center",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
        aria-hidden
      >
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <div className={compact ? "text-sm font-medium" : "text-base font-semibold"}>{title}</div>
      {description && <div className="text-xs text-muted-foreground max-w-xs">{description}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = "Loading...",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 text-muted-foreground",
        compact ? "py-4 text-xs" : "py-12 text-sm",
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  onRetry,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center py-10 gap-3">
      <div
        className="h-12 w-12 rounded-full bg-danger-soft text-danger flex items-center justify-center"
        aria-hidden
      >
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground max-w-xs">{description}</div>
      {onRetry && (
        <ActionButton size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </ActionButton>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Misc helpers re-exported for convenience                             */
/* ------------------------------------------------------------------ */
export { Bell, Briefcase, Calendar, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Building2 };
