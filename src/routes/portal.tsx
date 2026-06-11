import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PortalShell } from "@/features/staff-portal/components/PortalShell";
import { HomeTab } from "@/features/staff-portal/components/HomeTab";
import { ShiftsTab } from "@/features/staff-portal/components/ShiftsTab";
import { TimeTab } from "@/features/staff-portal/components/TimeTab";
import { LeaveTab } from "@/features/staff-portal/components/LeaveTab";
import { MoreTab } from "@/features/staff-portal/components/MoreTab";
import { NotificationDrawer } from "@/features/staff-portal/components/NotificationDrawer";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";
import type { PortalTab } from "@/features/staff-portal/types";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Staff portal — Docklist" },
      {
        name: "description",
        content:
          "Your shifts, time clock, leave and notifications in one mobile-first staff portal.",
      },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const [tab, setTab] = React.useState<PortalTab>("home");
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const notifications = useWorkspaceSelector((state) => state.portalNotifications);
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <>
      <PortalShell
        activeTab={tab}
        onTabChange={setTab}
        unreadNotifications={unread}
        onOpenNotifications={() => setNotificationsOpen(true)}
      >
        {tab === "home" && <HomeTab onNavigate={setTab} />}
        {tab === "shifts" && <ShiftsTab />}
        {tab === "time" && <TimeTab />}
        {tab === "leave" && <LeaveTab />}
        {tab === "more" && <MoreTab onNavigate={setTab} />}
      </PortalShell>
      <NotificationDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  );
}
