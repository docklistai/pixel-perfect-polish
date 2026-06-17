import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  PageHeader,
  ActionButton,
  IconButton,
  DialogShell,
  StatusBadge,
} from "@/components/dl";
import {
  Megaphone,
  MoreHorizontal,
  Gift,
  Users,
  User,
  X,
  ChevronRight,
  Edit3,
  Check,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { TeamKpiCards } from "@/features/team/components/TeamKpiCards";
import { TeamAnnouncementList } from "@/features/team/components/TeamAnnouncementList";
import { TeamRightRail } from "@/features/team/components/TeamRightRail";
import { TeamComposeDrawer } from "@/features/team/components/TeamComposeDrawer";
import { TeamAnnouncementDetailDrawer } from "@/features/team/components/TeamAnnouncementDetailDrawer";
import { TeamTrainingDetailDrawer } from "@/features/team/components/TeamTrainingDetailDrawer";
import {
  kpiItems,
  announcements,
  trainingItems,
  birthdayItems,
  staffEvents,
  quickGroups,
} from "@/features/team/data/teamDemoData";
import type { TeamAnnouncement, TeamBirthdayItem, TeamTrainingItem } from "@/features/team/types";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/team")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Team — Docklist" }] }),
  component: TeamPage,
});

function TeamPage() {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TeamAnnouncement | null>(null);
  const [selectedBirthday, setSelectedBirthday] = React.useState<TeamBirthdayItem | null>(null);
  const [selectedTraining, setSelectedTraining] = React.useState<TeamTrainingItem | null>(null);

  const handleBirthdayAction = (action: "note" | "update" | "profile" | "hide") => {
    if (!selectedBirthday) return;
    setSelectedBirthday(null);

    switch (action) {
      case "note":
        setComposeOpen(true);
        toast.info("Compose opened", {
          description: `Draft a note for ${selectedBirthday.n} — review before posting.`,
        });
        break;
      case "update":
        toast.info("Staff update draft prepared", {
          description: "Open the Announcements composer to finish and post",
        });
        break;
      case "profile":
        toast.info("Opening profile", {
          description: `Opening ${selectedBirthday.n}'s profile (demo)`,
        });
        break;
      case "hide":
        toast.info("Reminder hidden", {
          description: "Won't show again this week",
        });
        break;
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Share updates and briefings with your team — track who's read what."
        actions={
          <>
            <ActionButton icon={Megaphone} onClick={() => setComposeOpen(true)}>
              Compose
            </ActionButton>
            <IconButton icon={MoreHorizontal} label="More actions" />
          </>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-9 space-y-5">
          <TeamKpiCards items={kpiItems} />
          <TeamAnnouncementList announcements={announcements} onSelect={setSelected} />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <TeamRightRail
            training={trainingItems}
            birthdays={birthdayItems}
            events={staffEvents}
            groups={quickGroups}
            onSelectBirthday={setSelectedBirthday}
            onSelectTraining={setSelectedTraining}
            onComposeForGroup={() => setComposeOpen(true)}
          />
        </div>
      </div>

      <TeamComposeDrawer open={composeOpen} onOpenChange={setComposeOpen} />
      <TeamTrainingDetailDrawer
        item={selectedTraining}
        onOpenChange={(open) => !open && setSelectedTraining(null)}
      />
      <TeamAnnouncementDetailDrawer
        announcement={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />

      {/* Birthday Reminder Modal */}
      {selectedBirthday && (
        <DialogShell
          open={selectedBirthday !== null}
          onOpenChange={(open) => !open && setSelectedBirthday(null)}
          icon={Gift}
          iconTone="purple"
          title={`${selectedBirthday.n}'s birthday`}
          description="Private manager reminder · not shared with staff automatically"
          size="md"
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <ActionButton variant="ghost" size="sm" onClick={() => setSelectedBirthday(null)}>
                Close
              </ActionButton>
              <ActionButton
                variant="secondary"
                size="sm"
                icon={Check}
                onClick={() => {
                  setSelectedBirthday(null);
                  toast.success("Reminder cleared", {
                    description: "Birthday reminder marked as acknowledged",
                  });
                }}
              >
                Mark acknowledged
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center gap-3">
              <img
                src={`https://i.pravatar.cc/64?img=${selectedBirthday.img}`}
                className="h-12 w-12 rounded-full object-cover shrink-0"
                alt=""
              />
              <div>
                <div className="text-sm font-semibold text-foreground">{selectedBirthday.n}</div>
                <div className="text-xs text-muted-foreground">Team Member</div>
                <StatusBadge tone="purple" className="mt-1.5 inline-flex">
                  Birthday this week ({selectedBirthday.d})
                </StatusBadge>
              </div>
            </div>

            {/* Warning banner */}
            <div className="p-3 bg-brand-soft/20 border border-brand/20 rounded-xl flex items-start gap-2.5">
              <Info className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-normal">
                This is a <strong>manager-only reminder</strong>. Nothing has been shared with{" "}
                {selectedBirthday.n}. You decide whether to prepare a note or create a staff update.
              </p>
            </div>

            {/* Composer/Actions List */}
            <div className="space-y-2">
              {[
                {
                  id: "note" as const,
                  icon: Edit3,
                  tone: "brand" as const,
                  title: "Prepare birthday note",
                  desc: "Draft a personal message — you review before anything is saved",
                },
                {
                  id: "update" as const,
                  icon: Megaphone,
                  tone: "purple" as const,
                  title: "Create staff update draft",
                  desc: "Draft a team announcement — you post it manually when ready",
                },
                {
                  id: "profile" as const,
                  icon: User,
                  tone: "info" as const,
                  title: "Open profile",
                  desc: "View staff record, notes, and schedule",
                },
                {
                  id: "hide" as const,
                  icon: X,
                  tone: "muted" as const,
                  title: "Hide this reminder",
                  desc: "Won't appear again this week",
                },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleBirthdayAction(btn.id)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-all text-left group"
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      btn.tone === "brand"
                        ? "bg-brand-soft text-brand"
                        : btn.tone === "purple"
                          ? "bg-accent-purple-soft text-accent-purple"
                          : btn.tone === "info"
                            ? "bg-info-soft text-info"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <btn.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors">
                      {btn.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {btn.desc}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </DialogShell>
      )}
    </AppShell>
  );
}
