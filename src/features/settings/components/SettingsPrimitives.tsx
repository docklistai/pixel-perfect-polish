import * as React from "react";
import { Card, StatusBadge } from "@/components/dl";
import { cn } from "@/lib/utils";
import { SettingsToggle } from "./SettingsToggle";

export type ThemeMode = "light" | "dark";
export type DensityMode = "compact" | "comfortable" | "spacious";

export const settingCardClass = "rounded-3xl p-5 lg:p-6";

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function getThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("docklist.theme");
  if (stored === "light" || stored === "dark") return stored;
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function useThemePreference(): readonly [ThemeMode, (theme: ThemeMode) => void] {
  const [theme, setTheme] = React.useState<ThemeMode>("dark");

  useIsomorphicLayoutEffect(() => {
    const stored = getThemePreference();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  React.useEffect(() => {
    const syncTheme = () => setTheme(getThemePreference());
    window.addEventListener("theme-change", syncTheme);
    return () => window.removeEventListener("theme-change", syncTheme);
  }, []);

  const updateTheme = React.useCallback((next: ThemeMode) => {
    localStorage.setItem("docklist.theme", next);
    applyTheme(next);
    window.dispatchEvent(new Event("theme-change"));
    setTheme(next);
  }, []);

  return [theme, updateTheme] as const;
}

export function SectionCard({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(settingCardClass, className)}>
      <div className="mb-4 space-y-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">{title}</div>
          {badge}
        </div>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

export function PreviewTag({ children = "Preview" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="dock-section-eyebrow">{children}</div>;
}

export function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand",
        props.className,
      )}
    />
  );
}

export function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-brand",
        props.className,
      )}
    />
  );
}

export function DensityButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-brand/20 bg-brand-soft/60 text-brand shadow-[var(--shadow-card)]"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40",
      )}
    >
      {label}
    </button>
  );
}

export function ThemeChoiceCard({
  mode,
  active,
  onClick,
}: {
  mode: ThemeMode;
  active: boolean;
  onClick: () => void;
}) {
  const isDark = mode === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/40",
        active ? "border-brand/60 bg-brand-soft/30 shadow-[var(--shadow-card)]" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{isDark ? "Dark" : "Light"}</div>
          <div className="text-xs text-muted-foreground">
            {isDark
              ? "Warm, operational, night-shift friendly."
              : "Crisp, neutral, daylight reading."}
          </div>
        </div>
        {active && <StatusBadge tone="info">Active</StatusBadge>}
      </div>
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-xl border p-2",
          isDark ? "border-transparent bg-slate-950" : "border-border bg-slate-50",
        )}
      >
        <div className={cn("h-2 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")} />
        <div
          className={cn("mt-2 h-2 w-20 rounded-full", isDark ? "bg-slate-800" : "bg-slate-200")}
        />
        <div className={cn("mt-4 h-4 w-9 rounded-md", "bg-brand")} />
      </div>
    </button>
  );
}

export function ToggleRow({
  label,
  description,
  ariaLabel,
  onDirty,
  defaultOn = true,
  preview = false,
}: {
  label: string;
  description: string;
  ariaLabel: string;
  onDirty: () => void;
  defaultOn?: boolean;
  preview?: boolean;
}) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {label}
          {preview && <PreviewTag />}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <SettingsToggle
        aria-label={ariaLabel}
        on={on}
        onClick={() => {
          setOn((prev) => !prev);
          onDirty();
        }}
      />
    </div>
  );
}
