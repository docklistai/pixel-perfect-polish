import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Mail,
  Briefcase,
  Calendar,
  Clock,
  Plane,
  Activity,
  Pencil,
} from "lucide-react";
import { AppShell, Card, StatusBadge, type Tone } from "@/components/dl";
import { StaffMonogram } from "../StaffMonogram";
import { EditStaffDialog } from "../EditStaffDialog";
import { ProfileCard, Pair } from "./ProfileCard";
import { ProfileDocumentsTab } from "./ProfileDocumentsTab";
import { ProfileNotesTab } from "./ProfileNotesTab";
import { ProfileEmptyPanel } from "./ProfileEmptyPanel";
import { StaffProfileTabs, type ProfileTab } from "./StaffProfileTabs";
import { buildLiveStaffProfile } from "../../data/liveStaffProfile";
import type { StaffProfileNote, StaffRow } from "../../types";

const NOT_RECORDED = "Not recorded";

function statusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "On Leave") return "purple";
  if (status === "Probation") return "info";
  return "muted";
}

function portalTone(status: string | undefined): Tone {
  if (status === "Claimed") return "success";
  if (status === "Pending") return "warning";
  return "muted";
}

/** Tab → honest empty-state copy for live members with no history yet. */
function emptyPanel(tab: ProfileTab, firstName: string) {
  switch (tab) {
    case "schedule":
      return {
        icon: Calendar,
        title: "No schedule yet",
        description: `Shifts appear here once ${firstName} is scheduled on the rota.`,
        hint: "Add a shift from the rota to start building this view.",
      };
    case "time":
      return {
        icon: Clock,
        title: "No timesheets yet",
        description: `Clock-in and clock-out records appear here once ${firstName} starts logging time.`,
      };
    case "leave":
      return {
        icon: Plane,
        title: "No leave history yet",
        description: `Leave requests and absences appear here once they are recorded for ${firstName}.`,
      };
    case "insights":
      return {
        icon: Activity,
        title: "Not enough data yet",
        description: `Work-pattern insights appear once ${firstName} has rota and time history.`,
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
            This member is managed from your live workspace. Pay, documents, skills, schedule, time,
            and leave history fill in here as they are recorded — nothing is shown until it exists.
          </p>
        </ProfileCard>
      </aside>
    </div>
  );
}

interface LiveStaffProfileProps {
  member: StaffRow;
}

/**
 * Honest full-profile surface for a live workspace staff member. Reuses the
 * shared tab structure and the genuinely-empty-safe Documents and Notes tabs;
 * the data-driven tabs render honest empty states instead of the demo roster's
 * generated figures. No shifts, timesheets, pay, leave, or identity fields are
 * fabricated.
 */
export function LiveStaffProfile({ member }: LiveStaffProfileProps) {
  const profile = React.useMemo(() => buildLiveStaffProfile(member), [member]);
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("overview");
  const [notes, setNotes] = React.useState<StaffProfileNote[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const firstName = member.n.split(" ")[0] || member.n;

  React.useEffect(() => {
    setNotes([]);
  }, [member.id]);

  const handleSaveNote = React.useCallback((note: StaffProfileNote) => {
    setNotes((prev) => [note, ...prev]);
  }, []);

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
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/50"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit details
            </button>
          </div>
        </Card>
      </div>

      <EditStaffDialog open={editOpen} onOpenChange={setEditOpen} member={member} />

      <StaffProfileTabs activeTab={activeTab} onChange={setActiveTab} />

      <div
        role="tabpanel"
        id={`staff-profile-panel-${activeTab}`}
        aria-labelledby={`staff-profile-tab-${activeTab}`}
      >
        {activeTab === "overview" && <LiveOverviewPanel member={member} />}
        {activeTab === "documents" && <ProfileDocumentsTab profile={profile} />}
        {activeTab === "notes" && <ProfileNotesTab notes={notes} onSaveNote={handleSaveNote} />}
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
