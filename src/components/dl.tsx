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

/** Prototype status family name per tone — feeds .badge.<x>, .bubble.<x>, .rota-status.<x>. */
export const toneProto: Record<
  Tone,
  "teal" | "blue" | "green" | "amber" | "red" | "purple" | "slate"
> = {
  brand: "teal",
  info: "blue",
  success: "green",
  warning: "amber",
  danger: "red",
  purple: "purple",
  muted: "slate",
};

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
      <div className="dl-main flex-1">
        <Topbar searchPlaceholder={searchPlaceholder} />
        <div className="md:hidden px-4 pt-4">
          <FeedbackBanner
            tone="warning"
            title="Optimised for desktop"
            description="Docklist manager is optimised for desktop. Please use a larger screen."
          />
        </div>
        <main id="main-content" tabIndex={-1} className="flex-1 dl-page-in focus:outline-none">
          {children}
        </main>
        <footer>All times shown in Europe/London (GMT+1)</footer>
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
    <div className="page-head flex-col md:flex-row">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions flex-wrap">{actions}</div>}
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
    <div className={cn("mb-3.5 flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        {eyebrow && <span className="dock-section-eyebrow">{eyebrow}</span>}
        {title && <span className="text-sm font-semibold tracking-tight">{title}</span>}
        {count !== undefined && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      {action && <div className="text-xs">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/** Base card surface — emits prototype `.card`. Padding defaults to none so legacy callers can keep using Tailwind utilities. */
export function DashboardCard({
  className = "",
  children,
  as: Tag = "div",
  padding = "none",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article";
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const padCls =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "card-pad-sm"
        : padding === "lg"
          ? "card-pad-lg"
          : "card-pad";
  return <Tag className={cn("card", padCls, className)}>{children}</Tag>;
}

// Backwards-compat alias for routes that still import { Card }.
export const Card = DashboardCard;

/** Headline metric tile — emits prototype `.kpi`. */
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
  const proto = toneProto[tone];
  return (
    <div className={cn("kpi", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn("icon-bubble bubble", proto)} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="label">{label}</div>
      </div>
      <div className="value">{value}</div>
      {(sub || delta) && (
        <div className="delta">
          {sub}
          {delta && (
            <span
              className={cn(
                "ml-1 font-semibold",
                deltaTone === "success" && "delta up",
                deltaTone === "danger" && "delta down",
              )}
            >
              {delta}
            </span>
          )}
        </div>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
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
        className={cn("h-8 w-8 rounded-xl flex items-center justify-center", toneSoft[tone])}
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
    "w-full flex items-center gap-3.5 rounded-[16px] border border-border bg-card p-3 text-left shadow-[var(--shadow-card)] hover:bg-muted/40";
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
type ActionSize = "sm" | "md" | "lg";

const actionVariantClass: Record<ActionVariant, string> = {
  primary: "primary",
  secondary: "secondary",
  outline: "outline-teal",
  ghost: "ghost",
  danger: "danger",
};

export interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

/** Primary text-bearing button — emits prototype .btn variants. */
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
    const sizeCls = size === "sm" ? "sm" : size === "lg" ? "lg" : "";
    return (
      <button
        ref={ref}
        type={rest.type ?? "button"}
        className={cn("btn", actionVariantClass[variant], sizeCls, className)}
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

/** Square icon-only button — prototype `.icon-btn`. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "card", size = "md", className, ...rest },
  ref,
) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const sizeCls = size === "sm" ? "sm" : "";
  const variantCls = variant === "ghost" ? "border-transparent bg-transparent" : "";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn("icon-btn", sizeCls, variantCls, className)}
      {...rest}
    >
      <Icon className={iconSize} aria-hidden />
    </button>
  );
});

/** Pill-style filter trigger ("All teams ▾") — prototype .btn variant. */
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
      className={cn("btn sm", active ? "outline-teal" : "secondary", className)}
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

/** Small status pill — prototype `.badge.<tone>`. */
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
  const proto = toneProto[tone];
  return (
    <span className={cn("badge", proto !== "slate" && proto, dot && "dot", className)}>
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

/** Text search input — emits prototype `.input-group`. */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { containerClassName, variant = "inline", placeholder = "Search...", className, ...rest },
    ref,
  ) {
    return (
      <div className={cn("input-group", containerClassName)}>
        <Search className="ico h-3.5 w-3.5" aria-hidden />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className={cn(className)}
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
      <table className="tbl">
        {caption && (
          <caption className="text-left text-xs text-muted-foreground pb-2">{caption}</caption>
        )}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
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
              <td colSpan={columns.length} style={{ padding: "40px 14px" }}>
                <LoadingState compact />
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: "40px 14px" }}>
                {empty ?? <EmptyState compact title="No results" />}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className={cn(rowClassName?.(row, i))}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
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
              "h-7 w-7 rounded-xl text-xs",
              p === page
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-card)]"
                : "border border-border bg-card hover:bg-muted/50",
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
      <button className="rounded-xl border border-border bg-card px-2 py-1 flex items-center gap-1 shadow-[var(--shadow-card)] hover:bg-muted/50">
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
    <DashboardCard className={cn("p-5 md:p-6 self-start", className)}>
      {(title || onClose) && (
        <div className="mb-4 flex items-center justify-between">
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
    <div className={cn("dock-card-tight flex items-start gap-3 p-3.5", className)}>
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-[var(--shadow-card)]",
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
    <div className="empty" style={compact ? { padding: "24px 16px" } : undefined}>
      <div className="ill" aria-hidden>
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
      <h4>{title}</h4>
      {description && <p>{description}</p>}
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
      className="empty"
      style={compact ? { padding: "16px" } : undefined}
    >
      <div className="ill" aria-hidden>
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      </div>
      <p>{label}</p>
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
    <div
      role="alert"
      className="dock-card-tight flex flex-col items-center justify-center text-center py-10 gap-3 p-6"
    >
      <div
        className="h-12 w-12 rounded-full bg-danger-soft text-danger flex items-center justify-center shadow-[var(--shadow-card)]"
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
/* Interaction shells: Drawer / Dialog / Confirm                        */
/* ------------------------------------------------------------------ */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock, CheckCircle2, Info, XCircle } from "lucide-react";

export interface DrawerShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Footer rendered as right-aligned action group. Use ActionButton elements. */
  footer?: React.ReactNode;
  /** Optional badge/status node rendered next to the title. */
  meta?: React.ReactNode;
  side?: "right" | "left";
  width?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

const drawerWidths: Record<NonNullable<DrawerShellProps["width"]>, string> = {
  sm: "sm:!max-w-[360px]",
  md: "sm:!max-w-[420px]",
  lg: "sm:!max-w-[520px]",
  xl: "sm:!max-w-[600px]",
};

/** Right-side drawer using prototype `.drawer` chrome wrapped over Radix Sheet. */
export function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  meta,
  side = "right",
  width = "md",
  children,
}: DrawerShellProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        hideCloseButton
        className={cn(
          "drawer !flex w-full flex-col gap-0 overflow-hidden p-0 !rounded-none !border-l",
          drawerWidths[width],
        )}
        style={{
          background: "var(--bg-overlay)",
          borderColor: "var(--border)",
        }}
      >
        <SheetHeader className="drawer-head !block !space-y-0">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle
                className="!text-[15px] !font-semibold leading-tight"
                style={{ color: "var(--ink-900)" }}
              >
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription
                  className="!text-xs leading-5"
                  style={{ color: "var(--ink-500)" }}
                >
                  {description}
                </SheetDescription>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-2">
              {meta && <div>{meta}</div>}
              <SheetClose asChild>
                <IconButton icon={X} label="Close drawer" variant="ghost" size="sm" />
              </SheetClose>
            </div>
          </div>
        </SheetHeader>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

export interface DialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

const dialogSizes: Record<NonNullable<DialogShellProps["size"]>, string> = {
  sm: "sm:!max-w-[420px]",
  md: "sm:!max-w-[480px]",
  lg: "sm:!max-w-[560px]",
};

/** Centred modal dialog using prototype `.modal` chrome wrapped over Radix Dialog. */
export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  children,
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "modal !block p-0 !overflow-hidden !border !rounded-[16px]",
          dialogSizes[size],
        )}
        style={{
          background: "var(--bg-overlay)",
          borderColor: "var(--border)",
        }}
      >
        <DialogHeader className="modal-head !block !space-y-0">
          <DialogTitle className="modal-title">{title}</DialogTitle>
          {description && (
            <DialogDescription className="modal-sub">{description}</DialogDescription>
          )}
        </DialogHeader>
        {children && <div className="modal-body">{children}</div>}
        {footer && <DialogFooter className="modal-foot">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "brand" | "danger";
  onConfirm?: () => void;
}

/** Yes/no confirmation built on AlertDialog. Defaults to brand tone. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "brand",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="modal !block p-0 !overflow-hidden !border !rounded-[16px] sm:!max-w-[480px]"
        style={{
          background: "var(--bg-overlay)",
          borderColor: "var(--border)",
        }}
      >
        <AlertDialogHeader className="modal-head !block !space-y-0">
          <AlertDialogTitle className="modal-title">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="modal-sub">{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="modal-foot">
          <AlertDialogCancel className="btn secondary sm !mt-0">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn("btn sm", tone === "danger" ? "danger" : "primary")}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Form layout primitives                                               */
/* ------------------------------------------------------------------ */

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || description) && (
        <header className="space-y-0.5">
          {title && <h3 className="dock-section-eyebrow">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </header>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function FormRow({
  label,
  hint,
  htmlFor,
  required,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="dock-section-eyebrow flex items-center gap-1">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DetailRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xs font-medium text-foreground text-right max-w-[60%]">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* State + permission + feedback                                        */
/* ------------------------------------------------------------------ */

export type StatePanelKind = "empty" | "loading" | "error";

/** Convenience switch over Empty/Loading/Error states with a single API. */
export function StatePanel({
  kind,
  title,
  description,
  action,
  onRetry,
}: {
  kind: StatePanelKind;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onRetry?: () => void;
}) {
  if (kind === "loading")
    return <LoadingState label={typeof title === "string" ? title : undefined} />;
  if (kind === "error")
    return <ErrorState title={title} description={description} onRetry={onRetry} />;
  return (
    <EmptyState title={title ?? "Nothing here yet"} description={description} action={action} />
  );
}

/** "You don't have permission" placeholder used to gate restricted UI areas. */
export function PermissionState({
  title = "You don't have access to this area",
  description = "Ask a workspace admin to grant you the right permissions.",
  action,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className="dock-card-tight flex flex-col items-center justify-center text-center py-12 gap-3 p-6"
    >
      <div
        className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow-[var(--shadow-card)]"
        aria-hidden
      >
        <Lock className="h-5 w-5" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground max-w-xs">{description}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export type FeedbackTone = "success" | "info" | "warning" | "danger";

const feedbackIcons: Record<FeedbackTone, LucideIcon> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
};

const feedbackSurface: Record<FeedbackTone, string> = {
  success: "bg-success-soft text-success border-success/20",
  info: "bg-info-soft text-info border-info/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
};

/** Inline banner for save/discard, mock confirmations and other feedback. */
export function FeedbackBanner({
  tone = "info",
  title,
  description,
  action,
  onDismiss,
  className,
}: {
  tone?: FeedbackTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const Icon = feedbackIcons[tone];
  return (
    <div
      role="status"
      className={cn("dock-banner flex items-start gap-3 p-3", feedbackSurface[tone], className)}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 text-foreground">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <IconButton icon={X} label="Dismiss" variant="ghost" size="sm" onClick={onDismiss} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Keyboard, hints, recovery, sync                                      */
/* ------------------------------------------------------------------ */

/** Inline keyboard shortcut chip. Pass single key parts as children. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-md border border-border bg-muted text-[10px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Small inline help hint with a question-mark icon and tooltip-like text. */
export function HelpHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] text-muted-foreground", className)}
    >
      <HelpCircle className="h-3 w-3" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/**
 * Recovery card — used to surface a recoverable interruption
 * (e.g. "Your draft is still here"). Frontend-only; no real persistence.
 */
export function RecoveryCard({
  title,
  description,
  primaryLabel = "Resume",
  secondaryLabel = "Discard",
  onPrimary,
  onSecondary,
  tone = "info",
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  tone?: FeedbackTone;
  className?: string;
}) {
  const Icon = feedbackIcons[tone];
  return (
    <div
      className={cn("dock-banner flex items-start gap-3 p-3.5", feedbackSurface[tone], className)}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 text-foreground">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onSecondary && (
          <ActionButton size="sm" variant="ghost" onClick={onSecondary}>
            {secondaryLabel}
          </ActionButton>
        )}
        {onPrimary && (
          <ActionButton size="sm" variant="secondary" onClick={onPrimary}>
            {primaryLabel}
          </ActionButton>
        )}
      </div>
    </div>
  );
}

export type SyncStatus = "online" | "offline" | "syncing";

/** Compact connection / sync chip. Visual only — does not perform sync. */
export function SyncStatusBadge({
  status,
  lastChecked,
  className,
}: {
  status: SyncStatus;
  lastChecked?: React.ReactNode;
  className?: string;
}) {
  const map: Record<SyncStatus, { dot: string; label: string; text: string }> = {
    online: { dot: "bg-success", label: "Online", text: "text-success" },
    offline: { dot: "bg-danger", label: "Offline", text: "text-danger" },
    syncing: { dot: "bg-warning", label: "Syncing", text: "text-warning" },
  };
  const { dot, label, text } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1 text-[11px] shadow-[var(--shadow-card)]",
        text,
        className,
      )}
      title={typeof lastChecked === "string" ? `Last checked ${lastChecked}` : undefined}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />

      <span className="font-medium">{label}</span>
      {lastChecked && <span className="text-muted-foreground">· {lastChecked}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Misc helpers re-exported for convenience                             */
/* ------------------------------------------------------------------ */
export { Bell, Briefcase, Calendar, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, Building2 };
