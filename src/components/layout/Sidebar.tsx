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
  HelpCircle,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  group: "workspace" | "communication" | "admin";
  badge?: {
    count: number;
    kind: "amber" | "neutral";
  };
}

const navItems: readonly NavItem[] = [
  { to: "/", label: "Home", icon: Home, group: "workspace" },
  {
    to: "/rota",
    label: "Rota",
    icon: Calendar,
    group: "workspace",
    badge: { count: 3, kind: "amber" },
  },
  { to: "/staff", label: "Staff", icon: Users, group: "workspace" },
  {
    to: "/time",
    label: "Time",
    icon: Clock,
    group: "workspace",
    badge: { count: 18, kind: "neutral" },
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

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const footerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
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
    <aside className="hidden md:flex dock-sidebar shrink-0 select-none">
      {/* Brand area */}
      <div className="flex items-center gap-2.5 px-3 py-1 pb-5 select-none">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-gradient-to-br from-brand to-[#0ea5a2] font-extrabold text-[13px] text-[#08222A] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
          D
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Docklist</span>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
        {/* Workspace Group */}
        <div>
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-[#8896ac] uppercase select-none">
            Workspace
          </div>
          <nav className="dock-sidebar-nav" aria-label="Workspace">
            {navItems
              .filter((it) => it.group === "workspace")
              .map((item) => {
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className="dock-sidebar-item"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={
                          item.badge.kind === "amber"
                            ? { backgroundColor: "rgba(240,182,91,0.20)", color: "#F6CC85" }
                            : { backgroundColor: "rgba(255,255,255,0.07)", color: "#b7c4d9" }
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

        {/* Communication Group */}
        <div>
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-[#8896ac] uppercase select-none">
            Communication
          </div>
          <nav className="dock-sidebar-nav" aria-label="Communication">
            {navItems
              .filter((it) => it.group === "communication")
              .map((item) => {
                const active = path.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className="dock-sidebar-item"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Admin Group */}
        <div>
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-[#8896ac] uppercase select-none">
            Admin
          </div>
          <nav className="dock-sidebar-nav" aria-label="Admin">
            {navItems
              .filter((it) => it.group === "admin")
              .map((item) => {
                const active = path.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className="dock-sidebar-item"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>
      </div>

      <div className="dock-sidebar-footer relative mt-auto pt-4" ref={footerRef}>
        {/* Workspace display pill */}
        <button
          type="button"
          onClick={() => setWorkspaceOpen((prev) => !prev)}
          className="dock-sidebar-workspace flex items-center justify-between w-full text-left transition-colors hover:bg-white/5 border border-white/5 bg-white/5 rounded-xl p-2.5 cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={workspaceOpen}
        >
          <div className="dock-sidebar-workspace-meta flex items-center gap-2.5 min-w-0">
            <div className="dock-sidebar-workspace-icon flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4A6B95] to-[#2D436A] text-xs font-bold text-[#DDE5F0] border border-white/10">
              HV
            </div>
            <div className="min-w-0">
              <div className="dock-sidebar-workspace-name text-xs font-semibold text-white leading-tight">
                Harbour View Hotel
              </div>
              <div className="dock-sidebar-workspace-sub text-[11px] text-[#91a0b7] leading-tight">
                Main Workspace
              </div>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#8896ac] shrink-0" />
        </button>

        {workspaceOpen && (
          <div className="absolute bottom-[56px] left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#182338] p-1.5 shadow-[0_10px_32px_rgba(0,0,0,0.55)] animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#8896ac] uppercase">
              Workspaces
            </div>
            <div className="h-px bg-white/5 my-1" />
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/5 text-white font-medium text-xs">
              <span>Harbour View Hotel</span>
              <span className="h-2 w-2 rounded-full bg-brand" />
            </div>
            <div className="mt-1 flex items-center justify-between px-2.5 py-2 rounded-lg text-white/40 text-xs cursor-not-allowed hover:bg-white/[0.02]">
              <span>The Anchor Inn</span>
              <span className="text-[9px] uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded text-white/40 font-semibold">
                Soon
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-2 rounded-lg text-white/40 text-xs cursor-not-allowed hover:bg-white/[0.02]">
              <span>Riverside Brasserie</span>
              <span className="text-[9px] uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded text-white/40 font-semibold">
                Soon
              </span>
            </div>
          </div>
        )}

        {/* Help display — non-interactive until support link is available */}
        <div className="dock-sidebar-help pointer-events-none select-none mt-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <HelpCircle className="h-4 w-4 shrink-0 text-[#b7c4d9]" aria-hidden />
            <div className="min-w-0">
              <div className="dock-sidebar-help-title text-xs font-semibold text-white">
                Need help?
              </div>
              <div className="dock-sidebar-help-sub text-[11px] text-[#91a0b7]">
                Support coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
