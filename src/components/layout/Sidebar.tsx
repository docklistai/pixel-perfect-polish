import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Calendar,
  Users,
  Clock,
  Plane,
  MessageSquare,
  Briefcase,
  BarChart3,
  Settings,
  ChevronDown,
  HelpCircle,
  Building2,
} from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/rota", label: "Rota", icon: Calendar },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/time", label: "Time", icon: Clock },
  { to: "/leave", label: "Leave", icon: Plane },
  { to: "/team", label: "Team", icon: MessageSquare },
  { to: "/ops", label: "Ops", icon: Briefcase },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className="hidden md:flex w-64 shrink-0 flex-col text-sidebar-foreground"
      style={{ background: "var(--gradient-sidebar)" }}
    >
      <div className="px-7 pt-7 pb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">Docklist</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-sidebar-active text-sidebar-active-foreground shadow-sm"
                  : "text-sidebar-foreground/85 hover:bg-white/5"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-4 space-y-3">
        <button className="w-full flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left hover:bg-white/10 transition">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Harbour View Hotel</div>
              <div className="text-[11px] text-sidebar-muted">Main Workspace</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-sidebar-muted" />
        </button>

        <a
          className="flex items-center justify-between rounded-xl border border-sidebar-border/60 px-3 py-2.5 hover:bg-white/5 transition cursor-pointer"
          href="#"
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-4 w-4" />
            <div>
              <div className="text-xs font-semibold text-white">Need help?</div>
              <div className="text-[11px] text-sidebar-muted">Visit our Help Centre</div>
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
}
