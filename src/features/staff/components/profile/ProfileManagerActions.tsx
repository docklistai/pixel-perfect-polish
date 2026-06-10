import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Plane, Bell, Clock, Upload, Sparkles, type LucideIcon } from "lucide-react";
import { useOverlays } from "@/components/AppShortcuts";
import { useIntents } from "@/lib/interactionIntents";

interface ActionTileProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  sub: string;
  onClick: () => void;
}

function ActionTile({ icon: Icon, iconClassName, title, sub, onClick }: ActionTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="dock-card p-3.5 text-left hover:bg-muted/40 transition-colors w-full"
    >
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center mb-2.5 ${iconClassName}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="text-sm font-semibold leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </button>
  );
}

interface ProfileManagerActionsProps {
  firstName: string;
  onToast: (msg: string) => void;
}

export function ProfileManagerActions({ firstName, onToast }: ProfileManagerActionsProps) {
  const navigate = useNavigate();
  const { openAiDrawer } = useOverlays();
  const { requestIntent } = useIntents();
  const openRouteIntent = (to: "/rota" | "/leave", intent: "rota.addShift" | "leave.new") => {
    navigate({ to });
    requestIntent(intent);
  };

  const tiles: ActionTileProps[] = [
    {
      icon: Plus,
      iconClassName: "bg-brand text-white",
      title: "Add a shift",
      sub: "Open the shift modal",
      onClick: () => openRouteIntent("/rota", "rota.addShift"),
    },
    {
      icon: Plane,
      iconClassName: "bg-accent-purple text-white",
      title: "Log leave",
      sub: "On their behalf",
      onClick: () => openRouteIntent("/leave", "leave.new"),
    },
    {
      icon: Bell,
      iconClassName: "bg-info text-white",
      title: "Prepare reminder",
      sub: "Draft a staff reminder",
      onClick: () => onToast(`Reminder prepared for ${firstName} — review before sending`),
    },
    {
      icon: Clock,
      iconClassName: "bg-warning text-white",
      title: "Adjust timesheet",
      sub: "Open adjustment",
      onClick: () => onToast("Timesheet adjustment — connect to time"),
    },
    {
      icon: Upload,
      iconClassName: "bg-success text-white",
      title: "Upload document",
      sub: "Add to record",
      onClick: () => onToast("File picker would open — documents coming soon"),
    },
    {
      icon: Sparkles,
      iconClassName: "bg-brand text-white",
      title: "Ask the assistant",
      sub: `Anything about ${firstName}`,
      onClick: openAiDrawer,
    },
  ];

  return (
    <div>
      <div className="text-sm font-semibold text-foreground mb-1">Manager actions</div>
      <div className="text-xs text-muted-foreground mb-3">
        Common things you might do for {firstName}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <ActionTile key={t.title} {...t} />
        ))}
      </div>
    </div>
  );
}
