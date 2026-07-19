import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { StaffMonogram } from "@/features/staff/components/StaffMonogram";
import {
  AppShell,
  PageHeader,
  ActionButton,
  DialogShell,
  StatusBadge,
  AlertCard,
} from "@/components/dl";
import { Megaphone, Gift, ChevronRight, Edit3, Check, Info } from "lucide-react";
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
import { requirePreviewSurface } from "@/features/auth";

export const Route = createFileRoute("/team")({
  beforeLoad: ({ context }) => requirePreviewSurface(context.auth),
  head: () => ({ meta: [{ title: "Team — Docklist" }] }),
  component: TeamPage,
});

function TeamPage() {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TeamAnnouncement | null>(null);
  const [selectedBirthday, setSelectedBirthday] = React.useState<TeamBirthdayItem | null>(null);
  const [selectedTraining, setSelectedTraining] = React.useState<TeamTrainingItem | null>(null);

  const handleBirthdayAction = (action: "note" | "update") => {
    if (!selectedBirthday) return;
    setSelectedBirthday(null);

    switch (action) {
      case "note":
        setComposeOpen(true);
        toast.info("Compose opened", {
          description: `Preview a note for ${selectedBirthday.n}. Nothing is saved or sent.`,
        });
        break;
      case "update":
        toast.info("Preview only", {
          description: "Sample staff update opened in the composer. Nothing is saved or posted.",
        });
        break;
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Preview manager announcements, briefings, and private reminders without live messaging."
        actions={
          <ActionButton icon={Megaphone} onClick={() => setComposeOpen(true)}>
            Compose
          </ActionButton>
        }
      />

      <AlertCard
        className="mb-5"
        tone="warning"
        title="Preview — Team uses sample communication content"
        description="Announcements, read indicators, manager notes, birthdays, events, and training reminders are sample previews. No chat, social feed, monitoring, LMS, or staff delivery is live-wired."
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
                  toast.info("Preview only", {
                    description: "This sample birthday reminder was not updated.",
                  });
                }}
              >
                Preview acknowledge
              </ActionButton>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center gap-3">
              <StaffMonogram name={selectedBirthday.n} size="lg" />
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
                  desc: "Preview a personal note — nothing is saved or sent",
                },
                {
                  id: "update" as const,
                  icon: Megaphone,
                  tone: "purple" as const,
                  title: "Create staff update draft",
                  desc: "Preview a team announcement — nothing is posted",
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
                        : "bg-accent-purple-soft text-accent-purple"
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
