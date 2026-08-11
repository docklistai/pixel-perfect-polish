import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, Card } from "@/components/dl";
import { Megaphone, AlertTriangle, Loader2 } from "lucide-react";
import { TeamKpiCards } from "@/features/team/components/TeamKpiCards";
import { TeamAnnouncementList } from "@/features/team/components/TeamAnnouncementList";
import { TeamRightRail } from "@/features/team/components/TeamRightRail";
import { TeamComposeDrawer } from "@/features/team/components/TeamComposeDrawer";
import { TeamAnnouncementDetailDrawer } from "@/features/team/components/TeamAnnouncementDetailDrawer";
import { TeamTrainingDetailDrawer } from "@/features/team/components/TeamTrainingDetailDrawer";
import { TeamBirthdayDialog } from "@/features/team/components/TeamBirthdayDialog";
import { useTeamPage } from "@/features/team/hooks/useTeamPage";
import { useTeamCommands } from "@/features/team/hooks/useTeamCommands";
import { buildTeamKpis } from "@/features/team/lib/teamPresentation";
import type { TeamBirthday, TeamTrainingReminder } from "@/features/team/types";
import { requireManagerAccess } from "@/features/auth";

export const Route = createFileRoute("/team")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Team — Docklist" }] }),
  component: TeamPage,
});

function TeamStateCard({ state }: { state: "loading" | "error" }) {
  return (
    <Card className="rounded-2xl p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        {state === "loading" ? (
          <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
        ) : (
          <AlertTriangle className="size-6 text-warning" aria-hidden />
        )}
        <div>
          <h2 className="text-base font-semibold">
            {state === "loading" ? "Loading Team" : "Team could not be loaded"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === "loading"
              ? "Fetching your workspace announcements."
              : "Refresh the page to try loading your Team data again."}
          </p>
        </div>
      </div>
    </Card>
  );
}

function TeamPage() {
  const { data, isLoading, isError, selected, setSelectedId, actions } = useTeamPage();
  const commands = useTeamCommands(actions);

  const [composeOpen, setComposeOpen] = React.useState(false);
  const [composeAudienceKey, setComposeAudienceKey] = React.useState<string | null>(null);
  const [selectedBirthday, setSelectedBirthday] = React.useState<TeamBirthday | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = React.useState<string | null>(null);

  // Read the live row back by id so an open drawer reflects the latest counts
  // after a mutation instead of holding a stale copy.
  const selectedTraining: TeamTrainingReminder | null =
    data.trainingReminders.find((reminder) => reminder.id === selectedTrainingId) ?? null;
  const liveBirthday: TeamBirthday | null = selectedBirthday
    ? (data.birthdays.find((person) => person.staffMemberId === selectedBirthday.staffMemberId) ??
      null)
    : null;

  const kpis = React.useMemo(() => buildTeamKpis(data.announcements), [data.announcements]);

  const openCompose = (audienceKey: string | null = null) => {
    setComposeAudienceKey(audienceKey);
    setComposeOpen(true);
  };

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Send announcements to your team and track who has read and acknowledged them."
        actions={
          <ActionButton icon={Megaphone} onClick={() => openCompose()}>
            Compose
          </ActionButton>
        }
      />

      {isLoading ? (
        <TeamStateCard state="loading" />
      ) : isError ? (
        <TeamStateCard state="error" />
      ) : (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-12 lg:col-span-9 space-y-5">
            <TeamKpiCards items={kpis} />
            <TeamAnnouncementList
              announcements={data.announcements}
              audiences={data.audiences}
              onSelect={(announcement) => setSelectedId(announcement.id)}
              onCompose={() => openCompose()}
            />
          </div>
          <div className="col-span-12 lg:col-span-3">
            <TeamRightRail
              training={data.trainingReminders}
              birthdays={data.birthdays}
              events={data.staffEvents}
              audiences={data.audiences}
              onSelectBirthday={setSelectedBirthday}
              onSelectTraining={(reminder) => setSelectedTrainingId(reminder.id)}
              onComposeForAudience={(key) => openCompose(key)}
            />
          </div>
        </div>
      )}

      <TeamComposeDrawer
        open={composeOpen}
        onOpenChange={setComposeOpen}
        audiences={data.audiences}
        pending={actions.pending}
        presetAudienceKey={composeAudienceKey}
        onSubmit={commands.publishAnnouncement}
      />

      <TeamAnnouncementDetailDrawer
        announcement={selected}
        pending={actions.pending}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onAddComment={commands.addComment}
        onRemind={commands.remindNonReaders}
        onAcknowledge={commands.acknowledgeAnnouncement}
      />

      <TeamTrainingDetailDrawer
        item={selectedTraining}
        pending={actions.pending}
        onOpenChange={(open) => !open && setSelectedTrainingId(null)}
        onSendReminder={commands.sendTrainingReminder}
        onRecordCompletion={commands.recordTrainingCompletion}
        onSaveNote={commands.saveTrainingNote}
      />

      <TeamBirthdayDialog
        birthday={liveBirthday}
        pending={actions.pending}
        onOpenChange={(open) => !open && setSelectedBirthday(null)}
        onAcknowledge={commands.acknowledgeBirthday}
        onComposeNote={() => {
          setSelectedBirthday(null);
          openCompose();
        }}
      />
    </AppShell>
  );
}
