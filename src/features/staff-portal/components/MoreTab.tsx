import * as React from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  FormSection,
  StatusBadge,
} from "@/components/dl";
import { mockDocuments, mockNotices, mockProfile, mockTeamOnDuty } from "../data/mockPortalData";
import type { MoreSection, PortalTab } from "../types";

const APP_VERSION = "2.4.1 (138)";

export function MoreTab({ onNavigate }: { onNavigate: (tab: PortalTab) => void }) {
  const [section, setSection] = React.useState<MoreSection>(null);

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <DashboardCard className="p-5">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className="h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center text-base font-semibold"
          >
            {mockProfile.initials}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{mockProfile.name}</div>
            <div className="text-xs text-muted-foreground truncate">{mockProfile.role}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {mockProfile.department}
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Quick links to main tabs */}
      <DashboardCard className="p-2">
        <ul className="divide-y divide-border">
          <Row icon={Home} label="Home" onClick={() => onNavigate("home")} />
          <Row icon={CalendarDays} label="Shifts" onClick={() => onNavigate("shifts")} />
          <Row icon={Clock} label="Time" onClick={() => onNavigate("time")} />
          <Row icon={ClipboardList} label="Leave & Requests" onClick={() => onNavigate("leave")} />
        </ul>
      </DashboardCard>

      {/* Secondary menu */}
      <DashboardCard className="p-2">
        <ul className="divide-y divide-border">
          <Row icon={User} label="Profile" onClick={() => setSection("profile")} />
          <Row icon={Users} label="Team" onClick={() => setSection("team")} />
          <Row icon={FileText} label="Documents" onClick={() => setSection("documents")} />
          <Row icon={Settings} label="Settings" onClick={() => setSection("settings")} />
          <Row icon={HelpCircle} label="Help & support" onClick={() => setSection("help")} />
        </ul>
      </DashboardCard>

      <DashboardCard className="p-2">
        <ul className="divide-y divide-border">
          <Row
            icon={LogOut}
            label="Sign out"
            tone="danger"
            onClick={() => toast.message("Signed out (mock)")}
          />
        </ul>
      </DashboardCard>

      <div className="text-center text-[11px] text-muted-foreground">Docklist · v{APP_VERSION}</div>

      {/* Section drawers */}
      <ProfileDrawer open={section === "profile"} onClose={() => setSection(null)} />
      <TeamDrawer open={section === "team"} onClose={() => setSection(null)} />
      <DocumentsDrawer open={section === "documents"} onClose={() => setSection(null)} />
      <SettingsDrawer open={section === "settings"} onClose={() => setSection(null)} />
      <HelpDrawer open={section === "help"} onClose={() => setSection(null)} />
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
          "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-left hover:bg-muted/40 rounded-lg transition-colors " +
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

/* ---------- Profile ---------- */
function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = mockProfile;
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Profile"
      description="Your details and manager contact"
    >
      <div className="space-y-4">
        <DashboardCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center text-base font-semibold">
              {p.initials}
            </div>
            <div>
              <div className="text-base font-semibold">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.role}</div>
              <div className="mt-1">
                <StatusBadge tone={p.accessStatus === "active" ? "success" : "warning"} dot>
                  Portal access · {p.accessStatus}
                </StatusBadge>
              </div>
            </div>
          </div>
        </DashboardCard>

        <FormSection title="Your details">
          <DetailRow label="Department" value={p.department} />
          <DetailRow label="Email" value={p.email} />
          <DetailRow label="Phone" value={p.phone} />
        </FormSection>

        <FormSection title="Manager contact">
          <DetailRow label="Name" value={p.manager.name} />
          <DetailRow label="Email" value={p.manager.email} />
          <DetailRow label="Phone" value={p.manager.phone} />
        </FormSection>

        <div className="flex gap-2">
          <ActionButton
            size="sm"
            variant="secondary"
            icon={Mail}
            onClick={() => (window.location.href = `mailto:${p.manager.email}`)}
          >
            Email manager
          </ActionButton>
          <ActionButton
            size="sm"
            variant="secondary"
            icon={Phone}
            onClick={() => (window.location.href = `tel:${p.manager.phone}`)}
          >
            Call
          </ActionButton>
        </div>
      </div>
    </DrawerShell>
  );
}

/* ---------- Team ---------- */
function TeamDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const manager = mockTeamOnDuty.find((m) => m.isManagerOnDuty);
  const others = mockTeamOnDuty.filter((m) => !m.isManagerOnDuty);
  const noticeboard = mockNotices.find((n) => n.pinned);

  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Team"
      description="Who's on today and team noticeboard"
      footer={
        <ActionButton
          className="w-full justify-center"
          onClick={() => toast.message("Team briefing started (mock)")}
        >
          Start team briefing
        </ActionButton>
      }
    >
      <div className="space-y-4">
        {manager && (
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
              MANAGER ON DUTY
            </div>
            <TeamRow member={manager} />
          </div>
        )}
        <div>
          <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
            TEAM ON SHIFT
          </div>
          <ul className="space-y-2">
            {others.map((m) => (
              <li key={m.id}>
                <TeamRow member={m} />
              </li>
            ))}
          </ul>
        </div>
        {noticeboard && (
          <div>
            <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
              NOTICEBOARD
            </div>
            <DashboardCard className="p-4">
              <StatusBadge tone="brand" className="mb-2">
                Pinned
              </StatusBadge>
              <div className="text-sm font-semibold">{noticeboard.title}</div>
              <div className="mt-1 text-xs text-foreground">{noticeboard.body}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {noticeboard.postedBy} · {noticeboard.postedAt}
              </div>
            </DashboardCard>
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

function TeamRow({ member }: { member: (typeof mockTeamOnDuty)[number] }) {
  return (
    <DashboardCard className="p-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-semibold">
          {member.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{member.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{member.role}</div>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{member.shiftLabel}</span>
      </div>
    </DashboardCard>
  );
}

/* ---------- Documents ---------- */
function DocumentsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = React.useState<"All" | "Required" | "Certificates" | "Training">("All");
  const docs = tab === "All" ? mockDocuments : mockDocuments.filter((d) => d.category === tab);
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Documents"
      description="Read-only mock — documents shared with you."
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-muted p-1 grid grid-cols-4 text-[11px] font-medium">
          {(["All", "Required", "Certificates", "Training"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                t === tab
                  ? "py-1.5 rounded-lg bg-card text-foreground shadow-[var(--shadow-card)]"
                  : "py-1.5 rounded-lg text-muted-foreground"
              }
            >
              {t}
            </button>
          ))}
        </div>
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <DashboardCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold truncate">{d.title}</div>
                      <StatusBadge tone={d.status === "Expires soon" ? "warning" : "success"}>
                        {d.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{d.meta}</div>
                  </div>
                </div>
              </DashboardCard>
            </li>
          ))}
        </ul>
      </div>
    </DrawerShell>
  );
}

/* ---------- Settings ---------- */
function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Settings"
      description="Personal app preferences (mock)"
    >
      <div className="space-y-4">
        <Group title="Preferences">
          <SettingRow icon={Bell} label="Notifications" value="On" />
          <SettingRow icon={CalendarDays} label="Calendar sync" value="Off" />
          <SettingRow icon={Clock} label="Clock-in reminders" value="15 min before shift" />
        </Group>
        <Group title="Account & security">
          <SettingRow icon={ShieldCheck} label="Change password" />
          <SettingRow icon={ShieldCheck} label="Two-factor authentication" value="On" />
          <SettingRow icon={User} label="Login activity" />
        </Group>
        <Group title="Privacy">
          <SettingRow icon={ShieldCheck} label="Privacy policy" />
          <SettingRow icon={ShieldCheck} label="Data preferences" />
        </Group>
        <Group title="Support">
          <SettingRow icon={HelpCircle} label="Help centre" />
          <SettingRow icon={Mail} label="Contact support" />
          <SettingRow icon={Settings} label="App version" value={APP_VERSION} />
        </Group>
      </div>
    </DrawerShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
        {title.toUpperCase()}
      </div>
      <DashboardCard className="p-2">
        <ul className="divide-y divide-border">{children}</ul>
      </DashboardCard>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  return (
    <li>
      <button
        type="button"
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40 rounded-lg transition-colors"
        onClick={() => toast.message(`${label} (mock)`)}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left">{label}</span>
        {value && <span className="text-xs text-muted-foreground">{value}</span>}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </li>
  );
}

/* ---------- Help ---------- */
function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <DrawerShell
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Help & support"
      description="Find answers or contact your manager"
    >
      <div className="space-y-3">
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Help articles</div>
          <p className="text-xs text-muted-foreground mt-1">
            Browse short guides on shifts, leave, time clock and notifications.
          </p>
        </DashboardCard>
        <DashboardCard className="p-4">
          <div className="text-sm font-semibold">Contact your manager</div>
          <p className="text-xs text-muted-foreground mt-1">
            {mockProfile.manager.name} · {mockProfile.manager.email}
          </p>
        </DashboardCard>
        <div className="text-center text-[11px] text-muted-foreground">
          Docklist · v{APP_VERSION}
        </div>
      </div>
    </DrawerShell>
  );
}
