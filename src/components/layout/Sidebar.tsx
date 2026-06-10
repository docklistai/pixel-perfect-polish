import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  group: "workspace" | "communication" | "admin";
  flagship?: boolean;
  badge?: {
    count: number;
    kind: "amber" | "neutral" | "red";
  };
}

const navItems: readonly NavItem[] = [
  { to: "/", label: "Home", icon: Home, group: "workspace" },
  {
    to: "/rota",
    label: "Rota",
    icon: Calendar,
    group: "workspace",
    flagship: true,
    badge: { count: 3, kind: "amber" },
  },
  { to: "/staff", label: "Staff", icon: Users, group: "workspace" },
  {
    to: "/time",
    label: "Time",
    icon: Clock,
    group: "workspace",
    badge: { count: 5, kind: "red" },
  },
  {
    to: "/leave",
    label: "Leave",
    icon: Plane,
    group: "workspace",
    badge: { count: 4, kind: "amber" },
  },
  { to: "/team", label: "Team", icon: MessageSquare, group: "communication" },
  { to: "/ops", label: "Ops", icon: Briefcase, group: "communication" },
  { to: "/reports", label: "Reports", icon: BarChart3, group: "communication" },
  { to: "/settings", label: "Settings", icon: Settings, group: "admin" },
];

const NAV_GROUPS: ReadonlyArray<{
  key: NavItem["group"];
  label: string;
  ariaLabel: string;
}> = [
  { key: "workspace", label: "Workspace", ariaLabel: "Workspace" },
  { key: "communication", label: "Communication", ariaLabel: "Communication" },
  { key: "admin", label: "Admin", ariaLabel: "Admin" },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workspaceOpen) return;
    const clickHandler = (e: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) {
        setWorkspaceOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWorkspaceOpen(false);
    };
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [workspaceOpen]);

  return (
    <aside className="sidebar hidden md:flex select-none">
      {/* Brand */}
      <div className="brand">
        <span className="brand-glyph">D</span>
        <span>Docklist</span>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto pr-1 flex-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <div className="nav-section">{group.label}</div>
            <nav className="nav" aria-label={group.ariaLabel}>
              {navItems
                .filter((it) => it.group === group.key)
                .map((item) => {
                  const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={`nav-item ${active ? "active" : ""}`}
                    >
                      <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.8} />
                      <span>{item.label}</span>
                      {item.flagship && !active && (
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            color: "var(--teal-400)",
                            opacity: 0.8,
                            textTransform: "uppercase",
                          }}
                        >
                          Core
                        </span>
                      )}
                      {item.badge && (
                        <span
                          className="count"
                          style={
                            item.badge.kind === "amber"
                              ? {
                                  background: "rgba(240,182,91,0.20)",
                                  color: "#F6CC85",
                                }
                              : item.badge.kind === "red"
                                ? {
                                    background: "rgba(242,100,122,0.22)",
                                    color: "#FF8A9C",
                                  }
                                : {}
                          }
                        >
                          {item.badge.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      <div className="footer relative" ref={footerRef}>
        <button
          type="button"
          onClick={() => setWorkspaceOpen((prev) => !prev)}
          className="workspace-pill"
          aria-haspopup="listbox"
          aria-expanded={workspaceOpen}
        >
          <span className="icon">HV</span>
          <span className="meta min-w-0">
            <span className="name truncate block">Harbour View Hotel</span>
            <span className="sub truncate block">Main Workspace</span>
          </span>
          <ChevronDown className="chev h-3.5 w-3.5 shrink-0" />
        </button>

        {workspaceOpen && (
          <div
            className="absolute bottom-[56px] left-0 right-0 z-50 popover animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{ background: "var(--sidebar-bg)", borderColor: "rgba(255,255,255,0.10)" }}
          >
            <div className="menu-label" style={{ color: "var(--sidebar-dim)" }}>
              Workspaces
            </div>
            <div className="menu-sep" />
            <div
              className="menu-item"
              style={{ color: "#fff", background: "rgba(255,255,255,0.06)" }}
            >
              <span>Harbour View Hotel</span>
              <span
                className="ml-auto h-2 w-2 rounded-full"
                style={{ background: "var(--teal-500)" }}
              />
            </div>
            <div
              className="menu-item"
              style={{ color: "rgba(255,255,255,0.4)", cursor: "not-allowed" }}
            >
              <span>The Anchor Inn</span>
              <span className="tag-future soon ml-auto">Soon</span>
            </div>
            <div
              className="menu-item"
              style={{ color: "rgba(255,255,255,0.4)", cursor: "not-allowed" }}
            >
              <span>Riverside Brasserie</span>
              <span className="tag-future soon ml-auto">Soon</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
