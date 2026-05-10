import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/features/staff-portal/components/PortalShell";
import { HomeTab } from "@/features/staff-portal/components/HomeTab";
import { ScheduleTab } from "@/features/staff-portal/components/ScheduleTab";
import { ClockTab } from "@/features/staff-portal/components/ClockTab";
import { RequestsTab } from "@/features/staff-portal/components/RequestsTab";
import { NoticesTab } from "@/features/staff-portal/components/NoticesTab";
import { ProfileTab } from "@/features/staff-portal/components/ProfileTab";
import { mockNotices } from "@/features/staff-portal/data/mockPortalData";
import type { PortalTab } from "@/features/staff-portal/types";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Staff portal — Docklist" },
      {
        name: "description",
        content: "Your shifts, time clock, requests and notices in one mobile-first staff portal.",
      },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const [tab, setTab] = React.useState<PortalTab>("home");
  const unread = mockNotices.filter((n) => n.unread).length;

  return (
    <PortalShell activeTab={tab} onTabChange={setTab} unreadNotices={unread}>
      {tab === "home" && <HomeTab onNavigate={setTab} />}
      {tab === "schedule" && <ScheduleTab />}
      {tab === "clock" && <ClockTab />}
      {tab === "requests" && <RequestsTab />}
      {tab === "notices" && <NoticesTab />}
      {tab === "profile" && <ProfileTab />}
    </PortalShell>
  );
}
