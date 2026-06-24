import { DrawerShell, ActionButton, StatusBadge } from "@/components/dl";
import { Users, ExternalLink, Bell, CheckCircle2, Edit3, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { TeamTrainingItem } from "../types";

interface Props {
  item: TeamTrainingItem | null;
  onOpenChange: (open: boolean) => void;
}

export function TeamTrainingDetailDrawer({ item, onOpenChange }: Props) {
  const handlePrepareReminder = () => {
    onOpenChange(false);
    toast.info("Reminder prepared", {
      description: "Sample training reminder only. Nothing was saved or sent.",
    });
  };

  const actions = [
    {
      icon: Users,
      label: "Preview assigned staff",
      onClick: () =>
        toast.info("Preview only", {
          description: item ? `${item.t} uses sample assigned staff.` : "",
        }),
    },
    {
      icon: ExternalLink,
      label: "Preview training detail",
      onClick: () =>
        toast.info("Preview only", {
          description: item ? `${item.t} has no live training detail.` : "",
        }),
    },
    {
      icon: Bell,
      label: "Prepare reminder",
      onClick: handlePrepareReminder,
    },
    {
      icon: CheckCircle2,
      label: "Preview completion",
      onClick: () => {
        onOpenChange(false);
        toast.info("Preview only", { description: "No training completion record was updated." });
      },
    },
    {
      icon: Edit3,
      label: "Preview note",
      onClick: () => toast.info("Preview only", { description: "No training note was saved." }),
    },
  ];

  const rows = item
    ? [
        ["Source", item.source ?? "—"],
        ["Assigned to", item.assigned ?? "—"],
        ["Due", item.d.split("·")[0].trim()],
        ["Completion", item.complete ? `${item.complete} staff done` : "—"],
        ["Type", item.mandatory ? "Mandatory" : "Optional"],
      ]
    : [];

  return (
    <DrawerShell
      open={item !== null}
      onOpenChange={onOpenChange}
      title={item?.t ?? ""}
      description={
        item ? `Sample training reminder · ${item.d} · Source: ${item.source ?? "—"}` : ""
      }
      meta={
        item ? (
          <StatusBadge tone={item.mandatory ? "danger" : "info"}>
            {item.mandatory ? "Required" : "Optional"}
          </StatusBadge>
        ) : undefined
      }
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton variant="ghost" icon={Bell} onClick={handlePrepareReminder}>
            Preview reminder
          </ActionButton>
          <ActionButton
            onClick={() =>
              toast.info("Preview only", {
                description: item ? `${item.t} has no live training detail in this preview.` : "",
              })
            }
          >
            Preview detail
          </ActionButton>
        </>
      }
    >
      {item && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            {rows.map(([k, v], i) => (
              <div
                key={k}
                className={`flex items-center justify-between py-1.5 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {k}
                </span>
                <span className="text-xs font-semibold">{v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted/40"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <a.icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <span className="flex-1 text-sm font-semibold">{a.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
