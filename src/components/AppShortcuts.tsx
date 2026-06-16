/**
 * App-wide keyboard shortcut and overlay coordinator.
 *
 * Owns the open state for:
 *   - Command palette (Cmd/Ctrl+K)
 *   - Shortcuts dialog (?)
 *   - Notification drawer (bell icon in topbar)
 *
 * Exposes an OverlayContext so the topbar can trigger them without
 * having to thread props through the AppShell.
 *
 * Also handles the "G then X" navigation sequence (G→H, G→R, G→S, G→T).
 */
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { NotificationDrawer } from "./NotificationDrawer";
import { AiDrawer } from "./ai/AiDrawer";
import { InteractionIntentProvider } from "@/lib/interactionIntents";

interface OverlayApi {
  openPalette: () => void;
  openShortcuts: () => void;
  openNotifications: () => void;
  openAiDrawer: () => void;
  askAssistant: (prompt: string) => void;
  unreadCount: number;
}

const OverlayContext = React.createContext<OverlayApi | null>(null);

export function useOverlays(): OverlayApi {
  const ctx = React.useContext(OverlayContext);
  if (!ctx) {
    // Safe fallback so a stray topbar render outside the provider doesn't crash.
    return {
      openPalette: () => {},
      openShortcuts: () => {},
      openNotifications: () => {},
      openAiDrawer: () => {},
      askAssistant: () => {},
      unreadCount: 0,
    };
  }
  return ctx;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

const G_TARGETS: Record<string, "/" | "/rota" | "/staff" | "/time" | "/leave"> = {
  h: "/",
  r: "/rota",
  s: "/staff",
  t: "/time",
  l: "/leave",
};

export function AppShortcuts({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = React.useState(false);
  const [shortcuts, setShortcuts] = React.useState(false);
  const [notifs, setNotifs] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState<string | null>(null);
  // Starts at 0 so the badge reflects the actual notification inbox the drawer
  // reports (via onUnreadCountChange) instead of flashing a hardcoded count.
  const [unreadCount, setUnreadCount] = React.useState(0);
  const navigate = useNavigate();
  const gPending = React.useRef<number | null>(null);

  const api = React.useMemo<OverlayApi>(
    () => ({
      openPalette: () => setPalette(true),
      openShortcuts: () => setShortcuts(true),
      openNotifications: () => setNotifs(true),
      openAiDrawer: () => {
        setAiPrompt(null);
        setAiOpen(true);
      },
      askAssistant: (prompt: string) => {
        setAiPrompt(prompt);
        setAiOpen(true);
      },
      unreadCount,
    }),
    [unreadCount],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K — works even from inputs.
      if (meta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }

      if (isTypingTarget(e.target)) return;

      // "?" — open shortcuts.
      if (e.key === "?" && !meta) {
        e.preventDefault();
        setShortcuts(true);
        return;
      }

      // "G then X" sequence.
      if (gPending.current !== null) {
        const target = G_TARGETS[e.key.toLowerCase()];
        window.clearTimeout(gPending.current);
        gPending.current = null;
        if (target) {
          e.preventDefault();
          navigate({ to: target });
        }
        return;
      }
      if ((e.key === "g" || e.key === "G") && !meta && !e.altKey && !e.shiftKey) {
        gPending.current = window.setTimeout(() => {
          gPending.current = null;
        }, 1200);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gPending.current !== null) window.clearTimeout(gPending.current);
    };
  }, [navigate]);

  return (
    <InteractionIntentProvider>
      <OverlayContext.Provider value={api}>
        {children}
        <CommandPalette open={palette} onOpenChange={setPalette} />
        <ShortcutsDialog open={shortcuts} onOpenChange={setShortcuts} />
        <NotificationDrawer
          open={notifs}
          onOpenChange={setNotifs}
          onUnreadCountChange={setUnreadCount}
        />
        <AiDrawer open={aiOpen} initialPrompt={aiPrompt} onOpenChange={setAiOpen} />
      </OverlayContext.Provider>
    </InteractionIntentProvider>
  );
}
