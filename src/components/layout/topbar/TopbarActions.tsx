import * as React from "react";
import { SUPPORT_EMAIL } from "@/config/commercial";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useOverlays } from "@/components/AppShortcuts";
import { resetIdentityScopedClientState } from "@/features/auth";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { ThemeMode } from "./topbarUtils";

export function TopbarActions({
  theme,
  toggleTheme,
}: {
  theme: ThemeMode;
  toggleTheme: () => void;
}) {
  const { openAiDrawer, openNotifications, unreadCount } = useOverlays();
  const { email, roleLabel, initials } = useManagerIdentity();
  const displayName = email ?? "Your account";
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [userOpen, setUserOpen] = React.useState(false);
  const userRef = React.useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
    } catch {
      toast.error("Sign-out failed", { description: "Please try again." });
      return;
    }
    await resetIdentityScopedClientState(queryClient);
    await router.invalidate();
    await navigate({ to: "/auth" });
  };

  React.useEffect(() => {
    if (!userOpen) return;
    const clickHandler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserOpen(false);
    };
    document.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [userOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openAiDrawer}
        className="ai-btn"
        aria-label="Open manager support"
      >
        <Sparkles className="h-3.5 w-3.5" />
        <span>Support</span>
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        className="theme-btn hidden md:grid"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={openNotifications}
        className="bell"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="badge" aria-hidden>
            {unreadCount}
          </span>
        )}
      </button>

      <div className="relative" ref={userRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setUserOpen((prev) => !prev);
          }}
          className="user-pill"
          aria-haspopup="listbox"
          aria-expanded={userOpen}
        >
          <span className="av sm av-c1" aria-hidden>
            {initials}
          </span>
          <span className="info hidden 2xl:flex min-w-0">
            <strong className="truncate max-w-[180px]">{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
          <ChevronDown className="chev h-3.5 w-3.5 hidden 2xl:block" />
        </button>

        {userOpen && (
          <div className="popover absolute top-[44px] right-0 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="menu-label">{roleLabel}</div>
            <div
              className="px-2.5 pb-1 text-xs font-semibold truncate"
              style={{ color: "var(--ink-900)" }}
            >
              {displayName}
            </div>
            <div className="menu-sep" />

            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                toast.info("Profile settings", {
                  description: "Manage your profile from Settings → General for now.",
                });
              }}
              className="menu-item"
            >
              <User className="ico h-3.5 w-3.5" />
              <span>Profile</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                toast.info("Account settings", {
                  description: "Account management arrives in a later update.",
                });
              }}
              className="menu-item"
            >
              <Settings className="ico h-3.5 w-3.5" />
              <span>Account settings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                toast.info("Help & feedback", {
                  description: `Email ${SUPPORT_EMAIL} — private-beta support is handled manually.`,
                });
              }}
              className="menu-item"
            >
              <HelpCircle className="ico h-3.5 w-3.5" />
              <span>Help & feedback</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                toggleTheme();
              }}
              className="menu-item"
            >
              {theme === "dark" ? (
                <Sun className="ico h-3.5 w-3.5" />
              ) : (
                <Moon className="ico h-3.5 w-3.5" />
              )}
              <span>Toggle theme</span>
            </button>

            <div className="menu-sep" />

            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                void handleSignOut();
              }}
              className="menu-item danger"
            >
              <LogOut className="ico h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
