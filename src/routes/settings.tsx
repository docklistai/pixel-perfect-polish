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
import { isPilotSurface } from "@/config/pilot";
import { visibleSettingsTabs } from "@/features/settings/data/settingsTabs";

export const Route = createFileRoute("/settings")({
  beforeLoad: ({ context }) => requireManagerAccess(context.auth),
  head: () => ({ meta: [{ title: "Settings — Docklist" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const pilot = isPilotSurface();
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("General");
  // Bumping this key remounts the active tab, resetting its local field state.
  const [resetKey, setResetKey] = React.useState(0);
  const { workspaceName } = useManagerIdentity();

  const markDirty = React.useCallback(() => setDirty(true), []);

  // The pilot never offers a tab that was hidden from its sidebar.
  const visibleTabNames = visibleSettingsTabs(pilot).map((tab) => tab.t);
  const resolvedTab = visibleTabNames.includes(activeTab) ? activeTab : "General";

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
        subtitle={
          pilot
            ? "Workspace identity, opening days, and labour targets. Live sections save when you confirm them."
            : "Your workspace, teams, scheduling rules, and assistant preferences."
        }
        actions={
          pilot ? undefined : (
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
          )
        }
      />

      {!pilot && (
        <AlertCard
          className="mb-4"
          tone="warning"
          title="Preview — most settings are not live-wired yet"
          description="Labour targets (Rota & scheduling) save to your workspace and drive Rota and Home. Other settings, permissions, security controls, exports, and plan details remain labelled previews and do not change auth, billing, integrations, or files."
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SettingsSidebar activeTab={resolvedTab} onTabChange={setActiveTab} />
        <SettingsContent
          key={resetKey}
          activeTab={resolvedTab as SettingsContentTab}
          onDirty={markDirty}
        />
      </div>
    </AppShell>
  );
}
