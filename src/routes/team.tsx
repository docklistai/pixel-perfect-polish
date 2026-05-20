import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, IconButton } from "@/components/dl";
import { Megaphone, MoreHorizontal } from "lucide-react";
import { TeamKpiCards } from "@/features/team/components/TeamKpiCards";
import { TeamAnnouncementList } from "@/features/team/components/TeamAnnouncementList";
import { TeamRightRail } from "@/features/team/components/TeamRightRail";
import { TeamComposeDrawer } from "@/features/team/components/TeamComposeDrawer";
import { TeamAnnouncementDetailDrawer } from "@/features/team/components/TeamAnnouncementDetailDrawer";
import {
  kpiItems,
  announcements,
  trainingItems,
  birthdayItems,
  staffEvents,
  quickGroups,
} from "@/features/team/data/teamDemoData";
import type { TeamAnnouncement } from "@/features/team/types";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — Docklist" }] }),
  component: TeamPage,
});

function TeamPage() {
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TeamAnnouncement | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle="Share updates, keep everyone informed and connected."
        actions={
          <>
            <ActionButton icon={Megaphone} onClick={() => setComposeOpen(true)}>
              Compose announcement
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
          />
        </div>
      </div>

      <TeamComposeDrawer open={composeOpen} onOpenChange={setComposeOpen} />
      <TeamAnnouncementDetailDrawer
        announcement={selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </AppShell>
  );
}
