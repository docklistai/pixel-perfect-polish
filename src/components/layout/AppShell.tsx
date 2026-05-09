import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children, searchPlaceholder }: { children: React.ReactNode; searchPlaceholder?: string }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 px-8 py-7">{children}</main>
        <footer className="px-8 py-5 text-center text-xs text-muted-foreground">
          All times shown in Europe/London ⓘ
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] ${className}`}>
      {children}
    </div>
  );
}
