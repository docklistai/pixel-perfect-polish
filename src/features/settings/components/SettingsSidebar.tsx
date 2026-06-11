import { Card } from "@/components/dl";
import { settingsTabs, SETTINGS_GROUPS } from "../data/settingsTabs";

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <>
      {/* Mobile: compact horizontal chip strip so the first viewport is content, not nav. */}
      <div className="lg:hidden -mx-1 overflow-x-auto px-1">
        <nav aria-label="Settings navigation" className="flex gap-2 whitespace-nowrap pb-2">
          {settingsTabs.map((t) => {
            const active = activeTab === t.t;
            return (
              <button
                key={t.t}
                type="button"
                onClick={() => onTabChange(t.t)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand/30 bg-brand-soft/70 text-brand"
                    : "border-border bg-card text-foreground/80 hover:bg-muted/60"
                }`}
              >
                <t.icon
                  className={`h-3.5 w-3.5 ${active ? "text-brand" : "text-muted-foreground"}`}
                />
                {t.t}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Desktop: rich vertical sidebar, sticky to top. */}
      <Card className="hidden lg:block rounded-3xl p-2.5 self-start lg:sticky lg:top-6">
        <nav aria-label="Settings navigation">
          <div className="space-y-3">
            {SETTINGS_GROUPS.map((group) => {
              const groupTabs = settingsTabs.filter((t) => t.group === group.key);
              return (
                <div key={group.key}>
                  <div className="dock-section-eyebrow px-3 py-1.5">{group.label}</div>
                  <div className="space-y-0.5">
                    {groupTabs.map((t) => {
                      const active = activeTab === t.t;
                      return (
                        <button
                          key={t.t}
                          type="button"
                          onClick={() => onTabChange(t.t)}
                          aria-current={active ? "page" : undefined}
                          className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                            active
                              ? "border-brand/15 bg-brand-soft/70 text-brand shadow-[var(--shadow-card)]"
                              : "border-transparent hover:bg-muted/60"
                          }`}
                        >
                          <t.icon
                            className={`h-4 w-4 ${active ? "text-brand" : "text-muted-foreground"}`}
                          />
                          <div>
                            <div
                              className={`flex items-center gap-2 text-sm font-medium ${active ? "text-brand" : ""}`}
                            >
                              {t.t}
                              {t.preview && (
                                <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Preview
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{t.s}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>
      </Card>
    </>
  );
}
