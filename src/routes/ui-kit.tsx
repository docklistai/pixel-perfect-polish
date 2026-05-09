/**
 * Developer-only UI Kit / Design System reference for Docklist.
 *
 * This route is intentionally NOT linked from the sidebar — it exists for
 * frontend handoff only. Visit /ui-kit directly. Every example renders
 * mock-only data with realistic hospitality copy. None of the buttons here
 * trigger any real backend behaviour.
 */
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  PageHeader,
  SectionHeader,
  Card,
  DashboardCard,
  MetricCard,
  StatusBadge,
  ActionButton,
  IconButton,
  FilterButton,
  SearchField,
  DataTable,
  RightPanel,
  AlertCard,
  EmptyState,
  LoadingState,
  ErrorState,
  StatePanel,
  PermissionState,
  FeedbackBanner,
  DrawerShell,
  DialogShell,
  ConfirmDialog,
  FormSection,
  FormRow,
  DetailRow,
  Kbd,
  HelpHint,
  RecoveryCard,
  SyncStatusBadge,
  type Tone,
} from "@/components/dl";
import { useOverlays } from "@/components/AppShortcuts";
import {
  Calendar,
  Users,
  PoundSterling,
  Plus,
  Filter,
  MoreHorizontal,
  Bell,
  Settings,
  Download,
  Search,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/ui-kit")({
  head: () => ({
    meta: [
      { title: "UI Kit — Docklist (internal)" },
      { name: "description", content: "Developer-only design system reference." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UIKitPage,
});

const tones: Tone[] = ["brand", "info", "success", "warning", "danger", "purple", "muted"];

const sampleRows = [
  { name: "Sophie Carter", role: "FOH Supervisor", status: "Active", hours: "38h" },
  { name: "Daniel Mitchell", role: "Bar Lead", status: "On leave", hours: "0h" },
  { name: "Priya Patel", role: "Sous Chef", status: "Active", hours: "40h" },
];

function Block({
  name,
  description,
  children,
}: {
  name: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <header className="space-y-0.5">
        <h2 className="text-sm font-semibold text-foreground">{name}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </header>
      <Card className="p-5">{children}</Card>
    </section>
  );
}

function UIKitPage() {
  const [drawer, setDrawer] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [feedback, setFeedback] = React.useState<null | "success" | "warning">(null);

  return (
    <AppShell>
      <PageHeader
        title="UI Kit — internal reference"
        subtitle="Developer handoff only. Not linked from the sidebar. All interactions on this page are mock-only."
        actions={
          <>
            <StatusBadge tone="warning">Internal</StatusBadge>
            <ActionButton variant="secondary" icon={Settings}>
              Open in dev tools
            </ActionButton>
          </>
        }
      />

      <FeedbackBanner
        tone="info"
        title="This page is for designers and developers"
        description="It is not part of the customer-facing product. Do not link to it from production navigation."
        className="mb-6"
      />

      <div className="space-y-8">
        <Block
          name="PageHeader"
          description="Title, subtitle and right-aligned actions. Used at the top of every main page."
        >
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <PageHeader
              title="Rota"
              subtitle="Plan shifts, balance coverage and deliver great service."
              actions={
                <>
                  <FilterButton label="Week" />
                  <ActionButton icon={Plus}>Add shift</ActionButton>
                </>
              }
            />
          </div>
        </Block>

        <Block name="MetricCard" description="Top-of-page KPI tile.">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={Users}
              label="Scheduled hours"
              value="1,248h"
              sub="vs last week"
              delta="6%"
              deltaTone="success"
              tone="info"
            />
            <MetricCard
              icon={PoundSterling}
              label="Labour cost"
              value="£18,420"
              sub="vs last week"
              delta="3%"
              deltaTone="danger"
              tone="brand"
            />
            <MetricCard
              icon={Calendar}
              label="Coverage"
              value="98%"
              sub="vs last week"
              delta="2pp"
              deltaTone="success"
              tone="success"
            />
            <MetricCard icon={Bell} label="Open alerts" value="5" tone="warning" />
          </div>
        </Block>

        <Block name="DashboardCard" description="Container surface for grouped content.">
          <DashboardCard className="p-5">
            <SectionHeader eyebrow="TODAY" title="Front of House" count={3} />
            <p className="text-xs text-muted-foreground">
              Use DashboardCard as the standard surface for grouped content blocks.
            </p>
          </DashboardCard>
        </Block>

        <Block name="StatusBadge" description="Soft-tone status pill.">
          <div className="flex flex-wrap gap-2">
            {tones.map((t) => (
              <StatusBadge key={t} tone={t}>
                {t}
              </StatusBadge>
            ))}
          </div>
        </Block>

        <Block name="ActionButton" description="Primary text-bearing button.">
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton>Primary</ActionButton>
            <ActionButton variant="secondary">Secondary</ActionButton>
            <ActionButton variant="outline">Outline</ActionButton>
            <ActionButton variant="ghost">Ghost</ActionButton>
            <ActionButton variant="danger">Danger</ActionButton>
            <ActionButton icon={Plus}>With icon</ActionButton>
            <ActionButton size="sm">Small</ActionButton>
            <ActionButton disabled>Disabled</ActionButton>
          </div>
        </Block>

        <Block name="IconButton" description="Icon-only button. Always requires an aria-label.">
          <div className="flex items-center gap-2">
            <IconButton icon={MoreHorizontal} label="More actions" />
            <IconButton icon={Bell} label="Notifications" variant="ghost" />
            <IconButton icon={Settings} label="Settings" variant="outline" />
          </div>
        </Block>

        <Block name="FilterButton" description="Compact filter trigger with optional caret.">
          <div className="flex flex-wrap items-center gap-2">
            <FilterButton label="All departments" />
            <FilterButton icon={Filter} label="Filters" showCaret={false} />
            <FilterButton label="Active" active />
          </div>
        </Block>

        <Block name="SearchField">
          <SearchField placeholder="Search staff, roles, skills..." className="max-w-sm" />
        </Block>

        <Block name="DataTable" description="Striped rows, sortable headings, pagination-ready.">
          <DataTable
            rows={sampleRows}
            rowKey={(r) => r.name}
            columns={[
              { key: "name", header: "STAFF MEMBER", render: (r) => r.name },
              { key: "role", header: "ROLE", render: (r) => r.role },
              {
                key: "status",
                header: "STATUS",
                render: (r) => (
                  <StatusBadge tone={r.status === "Active" ? "success" : "muted"}>
                    {r.status}
                  </StatusBadge>
                ),
              },
              { key: "hours", header: "HOURS", render: (r) => r.hours, align: "right" },
            ]}
          />
        </Block>

        <Block name="RightPanel" description="Inline right-side inspector card.">
          <RightPanel title="Sophie Carter" onClose={() => undefined}>
            <p className="text-xs text-muted-foreground">
              Front of House Supervisor · Harbour View Hotel
            </p>
          </RightPanel>
        </Block>

        <Block name="AlertCard" description="Inline notice for the dashboard attention panel.">
          <div className="space-y-2">
            <AlertCard
              tone="warning"
              title="3 shifts are understaffed"
              description="Today · View shifts"
            />
            <AlertCard
              tone="danger"
              title="2 timesheets are overdue"
              description="Approve before Friday 12:00 (Europe/London)"
            />
          </div>
        </Block>

        <Block name="EmptyState">
          <EmptyState
            title="No leave requests"
            description="When staff request leave, it will appear here for review."
            action={<ActionButton size="sm">Request leave on behalf</ActionButton>}
          />
        </Block>

        <Block name="LoadingState">
          <LoadingState label="Loading rota..." />
        </Block>

        <Block name="ErrorState">
          <ErrorState
            title="We couldn't load the timesheets"
            description="Check your connection and try again."
            onRetry={() => undefined}
          />
        </Block>

        <Block name="StatePanel" description="Single API across empty / loading / error.">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="p-4">
              <StatePanel kind="empty" title="No incidents today" />
            </Card>
            <Card className="p-4">
              <StatePanel kind="loading" title="Loading..." />
            </Card>
            <Card className="p-4">
              <StatePanel kind="error" title="Could not load" />
            </Card>
          </div>
        </Block>

        <Block name="PermissionState" description="Shown when the viewer lacks access to an area.">
          <PermissionState
            title="You don't have access to Payroll exports"
            description="Ask a workspace admin to grant you the Payroll role."
          />
        </Block>

        <Block name="FeedbackBanner" description="Inline save / discard / mock confirmation.">
          <div className="space-y-2">
            <FeedbackBanner
              tone="success"
              title="Settings saved"
              description="Mock confirmation — nothing was written."
            />
            <FeedbackBanner
              tone="warning"
              title="You have unsaved changes"
              description="Save or discard before leaving."
            />
            <FeedbackBanner tone="info" title="Rota auto-fill is in beta" />
            <FeedbackBanner
              tone="danger"
              title="Couldn't reach the time clock"
              description="Mock error state."
            />
          </div>
        </Block>

        <Block
          name="DrawerShell"
          description="Right-side drawer with header, body and sticky footer."
        >
          <ActionButton onClick={() => setDrawer(true)}>Open example drawer</ActionButton>
        </Block>

        <Block name="DialogShell" description="Centred modal dialog with footer actions.">
          <ActionButton variant="secondary" onClick={() => setDialog(true)}>
            Open example dialog
          </ActionButton>
        </Block>

        <Block name="ConfirmDialog" description="Yes/no confirmation built on AlertDialog.">
          <div className="flex gap-2">
            <ActionButton variant="outline" onClick={() => setConfirm(true)}>
              Open confirm
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => setFeedback("success")}>
              Trigger success feedback
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => setFeedback("warning")}>
              Trigger warning feedback
            </ActionButton>
          </div>
          {feedback && (
            <div className="mt-3">
              <FeedbackBanner
                tone={feedback}
                title={feedback === "success" ? "Mock action confirmed" : "Mock warning"}
                description="Frontend example only."
                onDismiss={() => setFeedback(null)}
              />
            </div>
          )}
        </Block>

        <Block
          name="FormSection / FormRow / DetailRow"
          description="Used inside drawers and dialogs."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormSection title="Shift details" description="Mock-only example.">
              <FormRow label="Role" required>
                <select className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm">
                  <option>Front of House</option>
                  <option>Bar</option>
                  <option>Kitchen</option>
                </select>
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Start" required>
                  <input
                    type="time"
                    defaultValue="17:00"
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </FormRow>
                <FormRow label="End" required>
                  <input
                    type="time"
                    defaultValue="23:00"
                    className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  />
                </FormRow>
              </div>
              <FormRow label="Notes" hint="Visible to managers only.">
                <textarea className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </FormRow>
            </FormSection>

            <FormSection title="Staff member detail">
              <dl className="divide-y divide-border">
                <DetailRow label="Employee ID" value="DCL-1027" />
                <DetailRow label="Department" value="Front of House" />
                <DetailRow label="Contract" value="Full-time (40h/week)" />
                <DetailRow label="Pay rate" value="£13.50 per hour" />
                <DetailRow label="Location" value="Harbour View Hotel" />
              </dl>
            </FormSection>
          </div>
        </Block>

        <Block name="Icon search reference" description="Lucide icons used across Docklist.">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Search className="h-4 w-4" />
            <Calendar className="h-4 w-4" />
            <Users className="h-4 w-4" />
            <PoundSterling className="h-4 w-4" />
            <AlertTriangle className="h-4 w-4" />
            <Download className="h-4 w-4" />
            <Bell className="h-4 w-4" />
          </div>
        </Block>
      </div>

      {/* Example DrawerShell */}
      <DrawerShell
        open={drawer}
        onOpenChange={setDrawer}
        title="Example drawer"
        description="All Docklist drawers share this header / body / footer layout."
        meta={<StatusBadge tone="info">Example</StatusBadge>}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDrawer(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setDrawer(false)}>Save (mock)</ActionButton>
          </>
        }
      >
        <FormSection title="Body" description="Mock content. No data is saved.">
          <FormRow label="Shift name" required>
            <input className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm" />
          </FormRow>
        </FormSection>
      </DrawerShell>

      {/* Example DialogShell */}
      <DialogShell
        open={dialog}
        onOpenChange={setDialog}
        title="Example dialog"
        description="Use DialogShell for short, focused interactions."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDialog(false)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={() => setDialog(false)}>OK (mock)</ActionButton>
          </>
        }
      >
        <p>This dialog is a frontend example. Closing it does not change any data.</p>
      </DialogShell>

      {/* Example ConfirmDialog */}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Discard unsaved changes?"
        description="Mock confirmation — nothing will actually be discarded."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => setConfirm(false)}
      />

      {/* ---------- Keyboard, status & recovery ---------- */}
      <KeyboardAndStatusSection />
    </AppShell>
  );
}

function KeyboardAndStatusSection() {
  const { openPalette, openShortcuts, openNotifications } = useOverlays();
  return (
    <section className="mt-10 space-y-4">
      <SectionHeader eyebrow="KEYBOARD, STATUS & RECOVERY" title="Productivity primitives" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCard className="p-5 space-y-3">
          <div className="text-sm font-semibold">Keyboard chips</div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Kbd>Ctrl</Kbd>
            <span className="text-muted-foreground">+</span>
            <Kbd>K</Kbd>
            <span className="ml-3 text-muted-foreground">or</span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span className="ml-3 text-muted-foreground">·</span>
            <Kbd>?</Kbd>
            <span className="ml-3 text-muted-foreground">·</span>
            <Kbd>G</Kbd>
            <Kbd>R</Kbd>
          </div>
          <HelpHint>Press ? anywhere to see the full shortcut list.</HelpHint>
          <div className="flex flex-wrap gap-2 pt-2">
            <ActionButton size="sm" variant="secondary" onClick={openPalette}>
              Open command palette
            </ActionButton>
            <ActionButton size="sm" variant="secondary" onClick={openShortcuts}>
              Open shortcuts dialog
            </ActionButton>
            <ActionButton size="sm" variant="secondary" onClick={openNotifications}>
              Open notifications
            </ActionButton>
          </div>
        </DashboardCard>

        <DashboardCard className="p-5 space-y-3">
          <div className="text-sm font-semibold">Sync status</div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncStatusBadge status="online" lastChecked="just now" />
            <SyncStatusBadge status="syncing" lastChecked="2s ago" />
            <SyncStatusBadge status="offline" lastChecked="1 min ago" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Visual chip only — does not perform real sync.
          </p>
        </DashboardCard>

        <DashboardCard className="p-5 lg:col-span-2 space-y-3">
          <div className="text-sm font-semibold">Recovery cards</div>
          <RecoveryCard
            tone="info"
            title="Your draft shift is still here"
            description="You started a new shift for Saturday but didn't save it. Resume where you left off?"
            primaryLabel="Resume draft"
            secondaryLabel="Discard"
            onPrimary={() => {}}
            onSecondary={() => {}}
          />
          <RecoveryCard
            tone="warning"
            title="Connection dropped during edit"
            description="Mock — your last change wasn't sent. Retry when you're back online."
            primaryLabel="Retry"
            secondaryLabel="Keep offline"
            onPrimary={() => {}}
            onSecondary={() => {}}
          />
        </DashboardCard>
      </div>
    </section>
  );
}
