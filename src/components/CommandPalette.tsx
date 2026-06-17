/**
 * Global command palette (Ctrl/Cmd+K).
 *
 * Navigation entries route to top-level pages. Quick-action entries navigate
 * to the relevant route and then request a route-local surface to open via
 * the interaction intent bus (see src/lib/interactionIntents.tsx).
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Moon } from "lucide-react";
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
import { useIntents } from "@/lib/interactionIntents";
import { useOverlays } from "./AppShortcuts";
import {
  COMMAND_NAV_ITEMS,
  COMMAND_QUICK_ACTIONS,
  type CommandQuickAction,
  type NavTarget,
} from "./commandPaletteData";

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
  const { openAiDrawer } = useOverlays();

  const go = React.useCallback(
    (to: NavTarget) => {
      onOpenChange(false);
      navigate({ to });
    },
    [navigate, onOpenChange],
  );

  const runAction = React.useCallback(
    (action: CommandQuickAction) => {
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

  const runAskAssistant = React.useCallback(() => {
    onOpenChange(false);
    openAiDrawer();
  }, [onOpenChange, openAiDrawer]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">
        Search Docklist pages and quick actions. Use arrow keys to navigate and Enter to select.
      </DialogDescription>
      <CommandInput placeholder="Search anywhere, jump to anything…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {COMMAND_NAV_ITEMS.map((item) => {
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
        <CommandGroup heading="Actions">
          {COMMAND_QUICK_ACTIONS.map((action) => {
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
        <CommandGroup heading="Manager support">
          <CommandItem value="Open manager support" onSelect={runAskAssistant}>
            <Sparkles className="ico h-4 w-4" aria-hidden />
            <span>Open manager support</span>
          </CommandItem>
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
        <span className="ml-auto">Search by name, action or page</span>
      </div>
    </CommandDialog>
  );
}
