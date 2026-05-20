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
    <aside className="hidden md:flex dock-sidebar shrink-0">
      <div className="dock-sidebar-brand">Docklist</div>

      <nav className="dock-sidebar-nav" aria-label="Primary">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className="dock-sidebar-item"
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dock-sidebar-footer">
        <button type="button" className="dock-sidebar-workspace" aria-label="Switch workspace">
          <div className="dock-sidebar-workspace-meta">
            <div className="dock-sidebar-workspace-icon">
              <Building2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="dock-sidebar-workspace-name">Harbour View Hotel</div>
              <div className="dock-sidebar-workspace-sub">Main Workspace</div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-sidebar-muted" aria-hidden />
        </button>

        <a className="dock-sidebar-help" href="#">
          <div className="flex items-center gap-2.5 min-w-0">
            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="dock-sidebar-help-title">Need help?</div>
              <div className="dock-sidebar-help-sub">Visit our Help Centre</div>
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
}
