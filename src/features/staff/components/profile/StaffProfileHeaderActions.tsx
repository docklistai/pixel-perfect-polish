import * as React from "react";
import {
  MessageSquare,
  ChevronDown,
  Edit2,
  Lock,
  Download,
  Key,
  Plus,
  Plane,
  Clock,
} from "lucide-react";

interface StaffProfileHeaderActionsProps {
  name: string;
  onToast: (msg: string) => void;
}

export function StaffProfileHeaderActions({ name, onToast }: StaffProfileHeaderActionsProps) {
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!actionsOpen) return;
    function handler(e: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setActionsOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [actionsOpen]);

  const firstName = name.split(" ")[0];

  const menuItems = [
    { icon: Plus, label: "Add a shift", action: () => onToast("Shift modal — connect to rota") },
    { icon: Plane, label: "Log leave", action: () => onToast("Leave modal — connect to leave") },
    { icon: Clock, label: "Adjust timesheet", action: () => onToast("Adjustment modal (demo)") },
    null,
    { icon: Edit2, label: "Edit details", action: () => onToast("Edit modal (demo)") },
    { icon: Key, label: "Reset mobile PIN", action: () => onToast("New PIN sent by SMS (demo)") },
    null,
    {
      icon: Download,
      label: "Export profile",
      action: () => onToast("profile.pdf prepared (demo)"),
    },
    { icon: Lock, label: "Suspend", danger: true, action: () => onToast("Suspend — coming soon") },
  ] as const;

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end sm:shrink-0">
      <div className="flex max-w-full flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onToast(`Message ${firstName} (demo)`)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Message
        </button>

        <div className="relative" ref={actionsRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-controls="staff-profile-header-actions-menu"
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActionsOpen((o) => !o);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted/50 transition-colors"
          >
            Actions
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
          {actionsOpen && (
            <div
              id="staff-profile-header-actions-menu"
              role="menu"
              className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] rounded-xl border border-border bg-card shadow-lg py-1 overflow-hidden"
            >
              {menuItems.map((item, i) =>
                item === null ? (
                  <div key={i} className="my-1 h-px bg-border/60 mx-2" role="separator" />
                ) : (
                  <button
                    key={item.label}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      item.action();
                    }}
                    className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-left transition-colors hover:bg-muted/60 ${
                      "danger" in item && item.danger ? "text-danger" : "text-foreground"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {item.label}
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToast("Edit details (demo)")}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white px-3 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Edit2 className="h-3.5 w-3.5" aria-hidden />
          Edit details
        </button>
      </div>

      <div className="text-xs text-muted-foreground">
        Reports to <strong className="text-foreground font-semibold">Alex Thompson</strong>
      </div>
    </div>
  );
}
