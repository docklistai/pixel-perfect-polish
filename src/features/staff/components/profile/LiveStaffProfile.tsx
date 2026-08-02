import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Mail,
  Briefcase,
  Activity,
  Pencil,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { AppShell, Card, StatusBadge } from "@/components/dl";
import { StaffMonogram } from "../StaffMonogram";
import { EditStaffDialog } from "../EditStaffDialog";
import { OffboardStaffDialog } from "./OffboardStaffDialog";
import { ProfileCard, Pair } from "./ProfileCard";
import { ProfileEmptyPanel } from "./ProfileEmptyPanel";
import { LiveOperationalCards } from "./LiveOperationalCards";
import { LiveScheduleList } from "./LiveScheduleList";
import { LiveProfileLeaveTab } from "./LiveProfileLeaveTab";
import { LiveTimeList } from "./LiveTimeList";
import { StaffProfileTabs, type ProfileTab } from "./StaffProfileTabs";
import { statusTone, portalTone } from "./profileTones";
import { useLiveStaffProfileOps } from "../../hooks/useLiveStaffProfileOps";
import type { StaffRow } from "../../types";

const NOT_RECORDED = "Not recorded";

/**
 * Tab → honest empty-state copy for live members on the tabs that have no live
 * connection yet. Schedule, Leave, and Time are handled by their own live lists.
 */
function emptyPanel(
  tab: ProfileTab,
  firstName: string,
): { icon: LucideIcon; title: string; description: string; hint?: string } | null {
  switch (tab) {
    case "insights":
      return {
        icon: Activity,
        title: "Not enough data yet",
        description: `Work-pattern insights appear once ${firstName} has rota and time history.`,
      };
    case "documents":
      return {
        icon: Briefcase,
        title: "Documents are not connected",
        description: "Document storage and uploads are not available for live staff profiles.",
      };
    case "notes":
      return {
        icon: Activity,
        title: "Manager notes are not connected",
        description: "Live manager notes are not saved yet, so note editing is unavailable.",
      };
    default:
      return null;
  }
}

function LiveOverviewPanel({ member }: { member: StaffRow }) {
  const contract =
    member.contract && member.contract !== "—"
      ? member.hours && member.hours !== "—"
        ? `${member.contract} · ${member.hours}`
        : member.contract
      : NOT_RECORDED;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ProfileCard title="Member details" className="min-w-0">
        <Pair label="Role" value={member.role} />
        <Pair label="Department" value={member.dept} />
        <Pair label="Status" value={member.status} />
        <Pair label="Contract" value={contract} />
        <Pair label="Email" value={member.e ? member.e : NOT_RECORDED} />
        <Pair
          label="Mobile portal"
          value={
            <StatusBadge tone={portalTone(member.portalStatus)}>
              {member.portalStatus ?? "Not invited"}
            </StatusBadge>
          }
        />
      </ProfileCard>

      <aside className="min-w-0">
        <ProfileCard title="Profile detail">
          <p className="text-xs leading-relaxed text-muted-foreground">
            This member is managed from your live workspace. Scheduling, time, and leave history
            appear here only when live data is available.
          </p>
        </ProfileCard>
      </aside>
    </div>
  );
}

interface LiveStaffProfileProps {
  member: StaffRow;
  initialTab?: ProfileTab;
}

/**
 * Honest full-profile surface for a live workspace staff member. Unsupported
 * tabs render explicit empty states rather than demo figures or fake editors.
 */
export function LiveStaffProfile({ member, initialTab = "overview" }: LiveStaffProfileProps) {
  const [activeTab, setActiveTab] = React.useState<ProfileTab>(initialTab);
  const [editOpen, setEditOpen] = React.useState(false);
  const [offboardOpen, setOffboardOpen] = React.useState(false);
  // A successful offboard flips this member to `left`, which unmounts the
  // Offboard button below — so the dialog cannot hand focus back to the control
  // that opened it. This button is the adjacent action and has no status
  // condition, making it the nearest still-valid destination.
  const editDetailsRef = React.useRef<HTMLButtonElement | null>(null);
  const firstName = member.n.split(" ")[0] || member.n;
  const ops = useLiveStaffProfileOps(member.id);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const empty = emptyPanel(activeTab, firstName);

  return (
    <AppShell searchPlaceholder="Search staff...">
      <div className="mb-6">
        <Link
          to="/staff"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          All staff
        </Link>

        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            <StaffMonogram name={member.n} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[24px] font-semibold leading-none tracking-[-0.02em]">
                  {member.n}
                </h1>
                <StatusBadge tone={statusTone(member.status)} dot>
                  {member.status}
                </StatusBadge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {member.role} · {member.dept}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {member.e ? (
                  <a
                    href={`mailto:${member.e}`}
                    className="inline-flex items-center gap-1 font-mono transition-colors hover:text-foreground"
                  >
                    <Mail className="h-3 w-3 shrink-0" aria-hidden />
                    {member.e}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Mail className="h-3 w-3 shrink-0" aria-hidden />
                    {NOT_RECORDED}
                  </span>
                )}
                <span aria-hidden className="opacity-40">
                  •
                </span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                  {member.contract && member.contract !== "—" ? member.contract : NOT_RECORDED}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {member.employmentStatus !== "left" && (
                <button
                  type="button"
                  onClick={() => setOffboardOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-card px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft/30"
                >
                  <UserX className="h-3.5 w-3.5" aria-hidden />
                  Offboard
                </button>
              )}
              <button
                ref={editDetailsRef}
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit details
              </button>
            </div>
          </div>
        </Card>
      </div>

      <EditStaffDialog open={editOpen} onOpenChange={setEditOpen} member={member} />
      <OffboardStaffDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        staffMemberId={member.id}
        staffName={member.n}
        fallbackFocusRef={editDetailsRef}
      />

      <StaffProfileTabs activeTab={activeTab} onChange={setActiveTab} />

      <div
        role="tabpanel"
        id={`staff-profile-panel-${activeTab}`}
        aria-labelledby={`staff-profile-tab-${activeTab}`}
      >
        {activeTab === "overview" && (
          <div className="grid gap-5">
            <LiveOverviewPanel member={member} />
            <LiveOperationalCards ops={ops} firstName={firstName} />
          </div>
        )}
        {activeTab === "schedule" && <LiveScheduleList ops={ops} firstName={firstName} />}
        {activeTab === "leave" && (
          <LiveProfileLeaveTab staffMemberId={member.id} firstName={firstName} ops={ops} />
        )}
        {activeTab === "time" && <LiveTimeList ops={ops} firstName={firstName} />}
        {empty && (
          <ProfileEmptyPanel
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            hint={empty.hint}
          />
        )}
      </div>
    </AppShell>
  );
}
