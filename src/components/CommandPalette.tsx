/**
 * Global command palette (Ctrl/Cmd+K).
 *
 * Navigation entries route to top-level pages. Quick-action entries navigate
 * to the relevant route and then request a route-local surface to open via
 * the interaction intent bus (see src/lib/interactionIntents.tsx).
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Send,
  Sparkles,
  Moon,
} from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
import { useIntents, type IntentName } from "@/lib/interactionIntents";

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
  { label: "Time", to: "/time", icon: Clock, shortcut: "G T" },
  { label: "Leave", to: "/leave", icon: CalendarOff, shortcut: "G L" },
  { label: "Team", to: "/team", icon: MessageSquare },
  { label: "Ops", to: "/ops", icon: Wrench },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: SettingsIcon },
];

interface QuickAction {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  to: NavTarget;
  intent?: IntentName;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Publish rota",
    hint: "Open the publish dialog",
    icon: Send,
    to: "/rota",
    intent: "rota.publish",
  },
  {
    label: "Generate rota draft",
    hint: "Open the rota generator",
    icon: Sparkles,
    to: "/rota",
    intent: "rota.generate",
  },
  {
    label: "Add a shift",
    hint: "Open the add shift surface",
    icon: Plus,
    to: "/rota",
    intent: "rota.addShift",
  },
  {
    label: "Add team member",
    hint: "Open the invite dialog",
    icon: UserPlus,
    to: "/staff",
    intent: "staff.add",
  },
  {
    label: "New leave request",
    hint: "Open the new leave form",
    icon: CalendarOff,
    to: "/leave",
    intent: "leave.new",
  },
];

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function toggleDarkMode() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const next = readTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  root.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("docklist.theme", next);
  } catch {
    /* ignore storage errors */
  }
  window.dispatchEvent(new Event("theme-change"));
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();

  const go = React.useCallback(
    (to: NavTarget) => {
      onOpenChange(false);
      navigate({ to });
    },
    [navigate, onOpenChange],
  );

  const runAction = React.useCallback(
    (action: QuickAction) => {
      onOpenChange(false);
      navigate({ to: action.to });
      if (action.intent) {
        // Dispatch after navigation; the bus will fire immediately if the
        // target route is already mounted, otherwise it drains on mount.
        requestIntent(action.intent);
      }
    },
    [navigate, onOpenChange, requestIntent],
  );

  const runToggleTheme = React.useCallback(() => {
    onOpenChange(false);
    toggleDarkMode();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">
        Search Docklist pages and quick actions. Use arrow keys to navigate and Enter to select.
      </DialogDescription>
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
                <Icon className="ico h-4 w-4" aria-hidden />
                <span>{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.label}
                value={action.label}
                onSelect={() => runAction(action)}
              >
                <Icon className="ico h-4 w-4" aria-hidden />
                <span>{action.label}</span>
                <span className="meta ml-auto">{action.hint}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Preferences">
          <CommandItem value="Toggle dark mode" onSelect={runToggleTheme}>
            <Moon className="ico h-4 w-4" aria-hidden />
            <span>Toggle dark mode</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="cmd-foot">
        <span className="flex items-center gap-1.5">
          <span className="kbd">↑</span>
          <span className="kbd">↓</span>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="kbd">↵</span>
          <span>select</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="kbd">esc</span>
          <span>close</span>
        </span>
      </div>
    </CommandDialog>
  );
}
