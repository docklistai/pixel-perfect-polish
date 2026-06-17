import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { DrawerShell } from "@/components/dl";
import { AiChip } from "./AiChip";
import { AiDrawerBody } from "./AiDrawerBody";
import { AiDrawerHeader } from "./AiDrawerHeader";
import { buildSupportTopics } from "./aiDrawerData";
import { useWorkspaceSelector } from "@/features/demo/store/useWorkspaceStore";

export function AiDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekDrafts = useWorkspaceSelector((state) => state.weekDrafts);
  const leaveRequests = useWorkspaceSelector((state) => state.leaveRequests);
  const timeRows = useWorkspaceSelector((state) => state.timeRows);

  const topics = React.useMemo(() => {
    const draft = weekDrafts[String(weekOffset)] ?? weekDrafts["0"];
    return buildSupportTopics({
      pendingLeaveCount: leaveRequests.filter((request) => request.state === "pending").length,
      approvedLeaveCount: leaveRequests.filter((request) => request.state === "approved").length,
      pendingTimeCount: timeRows.filter((row) => row.status !== "approved").length,
      approvedTimeCount: timeRows.filter((row) => row.status === "approved").length,
      openShiftCount: draft?.shifts.filter((shift) => shift.status === "open").length ?? 0,
    });
  }, [weekDrafts, weekOffset, leaveRequests, timeRows]);

  const goTo = React.useCallback(
    (to: "/rota" | "/leave" | "/time") => {
      onOpenChange(false);
      void navigate({ to });
    },
    [navigate, onOpenChange],
  );

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      width="lg"
      title={<AiDrawerHeader />}
      description={undefined}
      meta={<AiChip label="Manager support" />}
    >
      <AiDrawerBody topics={topics} onGoTo={goTo} />
    </DrawerShell>
  );
}
