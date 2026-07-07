import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, ActionButton, AlertCard } from "@/components/dl";
import type { SettingsContentTab } from "@/features/settings/components/SettingsContent";
import { SettingsSidebar } from "@/features/settings/components/SettingsSidebar";
import { SettingsContent } from "@/features/settings/components/SettingsContent";
import { requireManagerAccess } from "@/features/auth";
import { useManagerIdentity } from "@/features/auth/hooks/useManagerIdentity";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Settings — Docklist" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("General");
  // Bumping this key remounts the active tab, resetting its local field state.
  const [resetKey, setResetKey] = React.useState(0);
  const { workspaceName } = useManagerIdentity();

  const markDirty = React.useCallback(() => setDirty(true), []);

  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setDirty(false);
      toast.info("Preview only", {
        description: "Preview only — no workspace settings are persisted.",
      });
    }, 600);
  };

  const handleDiscard = () => {
    if (saving) return;
    if (!dirty) {
      toast.info("No unsaved changes");
      return;
    }
    setResetKey((k) => k + 1);
    setDirty(false);
    toast.info("Changes discarded", {
      description: "Local preview edits were reset. No saved workspace settings changed.",
    });
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        subtitle="Your workspace, teams, scheduling rules, and assistant preferences."
        actions={
          <>
            <span className="guidance-note" style={{ marginRight: 4 }}>
              Preview changes for <strong>{workspaceName}</strong>
            </span>
            <ActionButton variant="ghost" onClick={handleDiscard}>
              Discard
            </ActionButton>
            <ActionButton onClick={handleSave}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {saving ? "Checking…" : "Preview save"}
            </ActionButton>
          </>
        }
      />

      <AlertCard
        className="mb-4"
        tone="warning"
        title="Preview — Settings changes are not live-wired"
        description="Some settings, permissions, security controls, exports, and plan details are sample previews. Unsupported actions are labelled and do not change auth, billing, integrations, or files."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SettingsContent
          key={resetKey}
          activeTab={activeTab as SettingsContentTab}
          onDirty={markDirty}
        />
      </div>
    </AppShell>
  );
}
