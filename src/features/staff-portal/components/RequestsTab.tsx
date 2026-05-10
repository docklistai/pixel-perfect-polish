import * as React from "react";
import { CalendarDays, Clock4, HelpCircle, Inbox } from "lucide-react";
import {
  ActionButton,
  DashboardCard,
  DetailRow,
  DrawerShell,
  EmptyState,
  FormRow,
  FormSection,
  QuickActionCard,
  StatusBadge,
} from "@/components/dl";
import { mockRequests } from "../data/mockPortalData";
import type { PortalRequest, RequestKind, RequestStatus } from "../types";

const statusTone: Record<RequestStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  declined: "danger",
};

const statusLabel: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

const kindLabel: Record<RequestKind, string> = {
  "time-off": "Time off",
  availability: "Availability change",
  "shift-question": "Shift question",
};

export function RequestsTab() {
  const [newOpen, setNewOpen] = React.useState(false);
  const [newKind, setNewKind] = React.useState<RequestKind>("time-off");
  const [detail, setDetail] = React.useState<PortalRequest | null>(null);

  const openNew = (kind: RequestKind) => {
    setNewKind(kind);
    setNewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Requests</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Submit a new request or check the status of an existing one.
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1">
          NEW REQUEST
        </div>
        <QuickActionCard
          icon={CalendarDays}
          title="Time off"
          description="Holiday, personal day or sickness"
          onClick={() => openNew("time-off")}
        />
        <QuickActionCard
          icon={Clock4}
          title="Availability change"
          description="Update the days or times you can work"
          onClick={() => openNew("availability")}
        />
        <QuickActionCard
          icon={HelpCircle}
          title="Shift question"
          description="Ask your manager about a specific shift"
          onClick={() => openNew("shift-question")}
        />
      </div>

      <div>
        <div className="text-[11px] font-semibold tracking-widest text-muted-foreground px-1 mb-2">
          YOUR REQUESTS
        </div>
        {mockRequests.length === 0 ? (
          <DashboardCard className="p-6">
            <EmptyState
              icon={Inbox}
              title="No requests yet"
              description="When you submit a request it will appear here."
            />
          </DashboardCard>
        ) : (
          <ul className="space-y-2">
            {mockRequests.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setDetail(r)} className="w-full text-left">
                  <DashboardCard className="p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{r.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.submitted}</div>
                      </div>
                      <StatusBadge tone={statusTone[r.status]}>{statusLabel[r.status]}</StatusBadge>
                    </div>
                  </DashboardCard>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* New request drawer */}
      <DrawerShell
        open={newOpen}
        onOpenChange={setNewOpen}
        title={`New request · ${kindLabel[newKind]}`}
        description="Mock form — nothing is submitted."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setNewOpen(false)}>Submit (mock)</ActionButton>
          </>
        }
      >
        <FormSection title="Details">
          <FormRow label="Type">
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as RequestKind)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <option value="time-off">Time off</option>
              <option value="availability">Availability change</option>
              <option value="shift-question">Shift question</option>
            </select>
          </FormRow>
          <FormRow label="From">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
          <FormRow label="To">
            <input
              type="date"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
          <FormRow label="Note">
            <textarea
              rows={3}
              placeholder="Add a short note for your manager"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </FormRow>
        </FormSection>
      </DrawerShell>

      {/* Detail drawer */}
      <DrawerShell
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail?.title ?? ""}
        description={detail?.submitted}
        footer={<ActionButton onClick={() => setDetail(null)}>Close</ActionButton>}
      >
        {detail && (
          <FormSection title="Request">
            <DetailRow label="Type" value={kindLabel[detail.kind]} />
            <DetailRow
              label="Status"
              value={
                <StatusBadge tone={statusTone[detail.status]}>
                  {statusLabel[detail.status]}
                </StatusBadge>
              }
            />
            <DetailRow label="Detail" value={detail.detail} />
            {detail.managerNote && <DetailRow label="Manager note" value={detail.managerNote} />}
          </FormSection>
        )}
      </DrawerShell>
    </div>
  );
}
