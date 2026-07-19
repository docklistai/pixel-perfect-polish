import * as React from "react";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, DashboardCard } from "@/components/dl";
import { resetIdentityScopedClientState } from "@/features/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { usePortalProfile } from "../hooks/usePortalProfile";
import { PortalProfileDrawer } from "./PortalProfileDrawer";
import { PortalTeamDrawer } from "./PortalTeamDrawer";
import { PortalDocumentsDrawer } from "./PortalDocumentsDrawer";
import { PortalSettingsDrawer } from "./PortalSettingsDrawer";
import { PortalHelpDrawer } from "./PortalHelpDrawer";
import type { MoreSection, PortalTab } from "../types";

export function MoreTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const [section, setSection] = React.useState<MoreSection>(null);
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

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
    await navigate({ to: "/portal/access" });
  };

  const { data: profile } = usePortalProfile();

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <DashboardCard className="p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center text-base font-semibold shadow-[var(--shadow-card)]"
          >
            {profile?.initials}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{profile?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{profile?.role}</div>
            <div className="text-[11px] text-muted-foreground truncate">{profile?.department}</div>
          </div>
        </div>
      </DashboardCard>

      {/* Quick links to main tabs */}
      <DashboardCard className="rounded-2xl p-2.5">
        <ul className="divide-y divide-border">
          <Row icon={Home} label="Home" onClick={() => onNavigate("home")} />
          <Row icon={CalendarDays} label="Shifts" onClick={() => onNavigate("shifts")} />
          <Row icon={Clock} label="Time" onClick={() => onNavigate("time")} />
          <Row icon={ClipboardList} label="Leave & Requests" onClick={() => onNavigate("leave")} />
        </ul>
      </DashboardCard>

      {/* Secondary menu */}
      <DashboardCard className="rounded-2xl p-2.5">
        <ul className="divide-y divide-border">
          <Row icon={User} label="Profile" onClick={() => setSection("profile")} />
          <Row icon={Users} label="Team" onClick={() => setSection("team")} />
          <Row icon={FileText} label="Documents" onClick={() => setSection("documents")} />
          <Row icon={Settings} label="Settings" onClick={() => setSection("settings")} />
          <Row icon={HelpCircle} label="Help & support" onClick={() => setSection("help")} />
        </ul>
      </DashboardCard>

      <DashboardCard className="rounded-2xl p-2.5">
        <ul className="divide-y divide-border">
          <Row
            icon={LogOut}
            label="Sign out"
            tone="danger"
            onClick={() => setConfirmSignOut(true)}
          />
        </ul>
      </DashboardCard>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        tone="danger"
        title="Sign out of your portal?"
        description="To sign back in you'll need a new access code from your manager — your single-use code can't be reused. Your shifts and requests stay safe in the meantime."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onConfirm={handleSignOut}
      />

      <div className="text-center text-[11px] text-muted-foreground">Docklist staff portal</div>

      {/* Section drawers */}
      <PortalProfileDrawer
        open={section === "profile"}
        onClose={() => setSection(null)}
        profile={profile}
      />
      <PortalTeamDrawer open={section === "team"} onClose={() => setSection(null)} />
      <PortalDocumentsDrawer open={section === "documents"} onClose={() => setSection(null)} />
      <PortalSettingsDrawer open={section === "settings"} onClose={() => setSection(null)} />
      <PortalHelpDrawer
        open={section === "help"}
        onClose={() => setSection(null)}
        profile={profile}
      />
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={
          "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/40 " +
          (tone === "danger" ? "text-danger" : "text-foreground")
        }
      >
        <Icon
          className={"h-4 w-4 " + (tone === "danger" ? "text-danger" : "text-muted-foreground")}
        />
        <span className="flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </li>
  );
}
