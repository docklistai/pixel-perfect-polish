/**
 * Global command palette (Ctrl/Cmd+K). Frontend-only — no backend actions.
 * Wraps the shadcn cmdk-based <Command/> primitives in a Dialog.
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Home,
  CalendarDays,
  Users,
  Clock,
  CalendarOff,
  MessageSquare,
  Wrench,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  UserPlus,
  Inbox,
  Download,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type NavTarget =
  | "/"
  | "/rota"
  | "/staff"
  | "/time"
  | "/leave"
  | "/team"
  | "/ops"
  | "/reports"
  | "/settings";

interface NavItem {
  label: string;
  to: NavTarget;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: Home, shortcut: "G H" },
  { label: "Rota", to: "/rota", icon: CalendarDays, shortcut: "G R" },
  { label: "Staff", to: "/staff", icon: Users, shortcut: "G S" },
  { label: "Time & Attendance", to: "/time", icon: Clock, shortcut: "G T" },
  { label: "Leave", to: "/leave", icon: CalendarOff },
  { label: "Team", to: "/team", icon: MessageSquare },
  { label: "Operations", to: "/ops", icon: Wrench },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

interface QuickAction {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  to: NavTarget;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Add shift (mock)",
    hint: "Open the rota with the add-shift drawer",
    icon: Plus,
    to: "/rota",
  },
  {
    label: "Add team member (mock)",
    hint: "Open the staff directory",
    icon: UserPlus,
    to: "/staff",
  },
  {
    label: "Review leave requests (mock)",
    hint: "Jump to the leave queue",
    icon: Inbox,
    to: "/leave",
  },
  {
    label: "Export reports (mock)",
    hint: "Open the reports workspace",
    icon: Download,
    to: "/reports",
  },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const go = React.useCallback(
    (to: NavTarget) => {
      onOpenChange(false);
      navigate({ to });
    },
    [navigate, onOpenChange],
  );

  const runMock = React.useCallback(
    (action: QuickAction) => {
      onOpenChange(false);
      navigate({ to: action.to });
      toast(action.label, {
        description: "Mock action — wire to backend in production.",
        icon: <ArrowRight className="h-3.5 w-3.5" aria-hidden />,
      });
    },
    [navigate, onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search Docklist or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.to}
                value={`${item.label} ${item.to}`}
                onSelect={() => go(item.to)}
              >
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions (mock)">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem key={action.label} value={action.label} onSelect={() => runMock(action)}>
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                <span>{action.label}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{action.hint}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
