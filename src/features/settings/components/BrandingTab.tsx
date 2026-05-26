import { cn } from "@/lib/utils";
import { toneSoft, toneText } from "@/components/dl";
import { SectionCard, ToggleRow } from "./SettingsPrimitives";

export function BrandingTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visual styling for the preview surface and department accents.
        </p>
      </div>

      <SectionCard
        title="App preview"
        description="A small device-style preview of the manager chrome."
      >
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-[11px] font-semibold text-white">
            <span>Harbour View Hotel</span>
            <span>Preview</span>
          </div>
          <div className="bg-muted/20 p-4">
            <div className="mx-auto flex h-14 w-24 items-center justify-center rounded-2xl bg-background text-center text-[9px] font-semibold leading-tight shadow-[var(--shadow-card)]">
              HVH
              <br />
              HARBOUR VIEW
              <br />
              HOTEL
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {["Rota", "Time", "Leave", "Messages"].map((label, index) => (
                <div key={label} className="space-y-1">
                  <div
                    className={cn(
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-xl",
                      index === 0 && "bg-danger-soft text-danger",
                      index === 1 && "bg-info-soft text-info",
                      index === 2 && "bg-warning-soft text-warning",
                      index === 3 && "bg-accent-purple-soft text-accent-purple",
                    )}
                  >
                    •
                  </div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Department colours"
        description="Small accent chips used in the preview cards."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Rota", "danger"],
            ["Time", "info"],
            ["Leave", "warning"],
            ["Messages", "purple"],
            ["Staff", "success"],
            ["Ops", "muted"],
          ].map(([label, tone]) => (
            <button
              key={label}
              type="button"
              onClick={onDirty}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left hover:bg-muted/30"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  toneSoft[tone as keyof typeof toneSoft],
                )}
              >
                <span
                  className={cn("text-xs font-semibold", toneText[tone as keyof typeof toneText])}
                >
                  {label.slice(0, 1)}
                </span>
              </span>
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">Local preview colour.</div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Interface preference"
        description="The visual style used in the settings preview."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Use compact header labels"
            description="Keep labels shorter in dense views."
            ariaLabel="Use compact header labels"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show status badges in preview"
            description="Badge chips appear in the local brand preview."
            ariaLabel="Show status badges in preview"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>
    </div>
  );
}
