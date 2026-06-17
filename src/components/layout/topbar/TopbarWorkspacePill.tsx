import * as React from "react";
import { Briefcase, ChevronDown } from "lucide-react";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";

export function TopbarWorkspacePill() {
  const { workspaceName } = useManagerIdentity();
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const workspaceRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!workspaceOpen) return;
    const clickHandler = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
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
    <div className="relative" ref={workspaceRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWorkspaceOpen((prev) => !prev);
        }}
        className="topbar-pill min-w-0"
        aria-haspopup="listbox"
        aria-expanded={workspaceOpen}
      >
        <Briefcase className="ico h-4 w-4" aria-hidden />
        <span className="font-medium truncate">{workspaceName}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-[var(--ink-400)]" />
      </button>

      {workspaceOpen && (
        <div className="popover absolute top-[44px] left-0 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="menu-label">Workspace</div>
          <div className="menu-sep" />
          <div className="menu-item" style={{ background: "var(--bg-hover)" }}>
            <span className="truncate">{workspaceName}</span>
            <span
              className="ml-auto h-2 w-2 rounded-full"
              style={{ background: "var(--teal-500)" }}
            />
          </div>
          <div className="px-2.5 py-2 text-[11px]" style={{ color: "var(--ink-400)" }}>
            Switching between workspaces comes later.
          </div>
        </div>
      )}
    </div>
  );
}
