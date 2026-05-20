import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AppShell,
  Card,
  PageHeader,
  ActionButton,
  FeedbackBanner,
  EmptyState,
} from "@/components/dl";
import { SettingsSidebar } from "@/features/settings/components/SettingsSidebar";
import { WorkspaceSection } from "@/features/settings/components/WorkspaceSection";
import { SettingsRightRail } from "@/features/settings/components/SettingsRightRail";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Docklist" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [dirty, setDirty] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("Workspace");

  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Manage your workspace settings, policies and preferences."
        actions={
          <>
            <ActionButton
              variant="secondary"
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                setSaved(false);
              }}
            >
              Discard changes
            </ActionButton>
            <ActionButton
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                setSaved(true);
              }}
            >
              Save changes
            </ActionButton>
          </>
        }
      />

      {dirty && (
        <FeedbackBanner
          tone="warning"
          title="You have unsaved changes"
          description="Save or discard before leaving this page."
          className="mb-4"
        />
      )}
      {saved && (
        <FeedbackBanner
          tone="success"
          title="Settings saved"
          description="Settings saved for this session."
          className="mb-4"
          onDismiss={() => setSaved(false)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab !== "Workspace" ? (
          <Card className="rounded-3xl p-6">
            <EmptyState
              title={`${activeTab} settings`}
              description="This section is not available yet."
            />
          </Card>
        ) : (
          <WorkspaceSection onDirty={markDirty} />
        )}

        <SettingsRightRail activeTab={activeTab} />
      </div>
    </AppShell>
  );
}
