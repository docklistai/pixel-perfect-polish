import * as React from "react";
import { Plus, Plane, MessageSquare, Clock, Upload, Sparkles, type LucideIcon } from "lucide-react";

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
  const tiles: ActionTileProps[] = [
    {
      icon: Plus,
      iconClassName: "bg-brand text-white",
      title: "Add a shift",
      sub: "Open the shift modal",
      onClick: () => onToast("Shift modal would open — connect to rota"),
    },
    {
      icon: Plane,
      iconClassName: "bg-accent-purple text-white",
      title: "Log leave",
      sub: "On their behalf",
      onClick: () => onToast("Leave modal would open — connect to leave"),
    },
    {
      icon: MessageSquare,
      iconClassName: "bg-info text-white",
      title: "Send a message",
      sub: "Open chat",
      onClick: () => onToast(`Conversation with ${firstName} — messaging coming soon`),
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
      onClick: () => onToast("AI assistant — coming soon"),
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
