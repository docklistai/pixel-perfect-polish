import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AppShell, PageHeader, ActionButton, FeedbackBanner } from "@/components/dl";
import type { SettingsContentTab } from "@/features/settings/components/SettingsContent";
import { SettingsSidebar } from "@/features/settings/components/SettingsSidebar";
import { SettingsContent } from "@/features/settings/components/SettingsContent";
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
        subtitle="Your workspace, teams, scheduling rules, and assistant preferences."
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
        <SettingsContent activeTab={activeTab as SettingsContentTab} onDirty={markDirty} />
        <SettingsRightRail activeTab={activeTab} />
      </div>
    </AppShell>
  );
}
