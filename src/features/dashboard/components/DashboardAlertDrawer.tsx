import { DrawerShell, ActionButton, FormSection, DetailRow, StatusBadge } from "@/components/dl";
import {
  AlertTriangle,
  Clock,
  Plane,
  Sparkles,
  Calendar,
  ArrowRight,
  User,
  BellOff,
} from "lucide-react";
import { useOverlays } from "@/components/AppShortcuts";
import { useNavigate } from "@tanstack/react-router";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIndex: number;
}

export function DashboardAlertDrawer({ open, onOpenChange, selectedIndex }: Props) {
  const { openAiDrawer } = useOverlays();
  const navigate = useNavigate();

  // Selected details
  const alerts = [
    {
      title: "3 shifts still unassigned this week",
      sub: "Resolve before Friday 16:00 to publish on time",
      tag: "Action needed",
      tone: "warning" as const,
      icon: AlertTriangle,
      route: "/rota" as const,
      cta: "Open rota",
      detail: {
        headline: "Three open shifts need cover",
        body: "All three are evening Bar shifts. Eligible staff can see the open shifts in their staff app preview — two have shown interest.",
        list: [
          {
            icon: Calendar,
            title: "Fri 16 May · 18:00 – 00:00",
            sub: "Bar · open shift",
            value: "2 interested",
            tagTone: "success" as const,
          },
          {
            icon: Calendar,
            title: "Sat 17 May · 18:00 – 00:00",
            sub: "Bar · open shift",
            value: "1 interested",
            tagTone: "warning" as const,
          },
          {
            icon: Calendar,
            title: "Sun 18 May · 16:00 – 22:00",
            sub: "Bar · open shift",
            value: "No takers",
            tagTone: "danger" as const,
          },
        ],
        ai: {
          title: "Two of these could be filled by Liam and James",
          body: "Both are eligible, under their contracted hours, and have picked up Saturday Bar before. You can assign with one click.",
          prompt: "Help me fill these three open Bar shifts this week",
        },
      },
    },
    {
      title: "2 timesheets need approval",
      sub: "Last week · payroll closes Friday",
      tag: "Overdue",
      tone: "danger" as const,
      icon: Clock,
      route: "/time" as const,
      cta: "Review now",
      detail: {
        headline: "Two timesheets are blocking sign-off",
        body: "Both have exceptions — review the flags before approving.",
        list: [
          {
            isStaff: true,
            title: "Liam O'Connor",
            sub: "Bar · Week of 5 May",
            value: "Late in",
            tagTone: "warning" as const,
          },
          {
            isStaff: true,
            title: "James Walker",
            sub: "FOH · Week of 5 May",
            value: "Missing in",
            tagTone: "danger" as const,
          },
        ],
        ai: null,
      },
    },
    {
      title: "1 leave request — high coverage impact",
      sub: "Priya · 31 May – 2 Jun",
      tag: "Decision needed",
      tone: "purple" as const,
      icon: Plane,
      route: "/leave" as const,
      cta: "Review",
      detail: {
        headline: "Approving leaves Housekeeping at 50% on Sunday",
        body: "Priya has 19 days notice — within policy. But Saturday + Sunday only have two HK staff scheduled.",
        list: [
          {
            icon: AlertTriangle,
            title: "Sat 31 May",
            sub: "Housekeeping coverage",
            value: "60%",
            tagTone: "warning" as const,
          },
          {
            icon: AlertTriangle,
            title: "Sun 1 Jun",
            sub: "Housekeeping coverage",
            value: "50%",
            tagTone: "danger" as const,
          },
          {
            icon: AlertTriangle,
            title: "Mon 2 Jun",
            sub: "Housekeeping coverage",
            value: "66%",
            tagTone: "warning" as const,
          },
        ],
        ai: {
          title: "Could ask Ava to swap her Sunday off",
          body: "Ava is on holiday on Tuesday — moving her day off there would close the Sunday gap.",
          prompt: "Help me cover housekeeping if I approve Priya's leave 31 May – 2 Jun",
        },
      },
    },
  ];

  const activeAlert = alerts[selectedIndex] || alerts[0];
  const IconComponent = activeAlert.icon;

  const handleCta = () => {
    onOpenChange(false);
    navigate({ to: activeAlert.route });
  };

  const handleSnooze = () => {
    onOpenChange(false);
    import("sonner").then(({ toast }) =>
      toast.info("Snoozed", { description: "Reminder set for tomorrow 09:00" }),
    );
  };

  const toneIconClass =
    activeAlert.tone === "danger"
      ? "bg-danger-soft text-danger"
      : activeAlert.tone === "purple"
        ? "bg-accent-purple-soft text-accent-purple"
        : "bg-warning-soft text-warning";

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={activeAlert.title}
      description={activeAlert.sub}
      meta={
        <StatusBadge tone={activeAlert.tone === "purple" ? "info" : activeAlert.tone}>
          {activeAlert.tag}
        </StatusBadge>
      }
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton variant="ghost" icon={BellOff} onClick={handleSnooze}>
            Snooze
          </ActionButton>
          <ActionButton onClick={handleCta}>
            {activeAlert.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </ActionButton>
        </>
      }
    >
      <div className="flex gap-4 items-start pb-4 border-b border-border">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneIconClass}`}
        >
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">{activeAlert.detail.headline}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{activeAlert.detail.body}</p>
        </div>
      </div>

      <FormSection title="Affected details">
        <div className="space-y-2.5">
          {activeAlert.detail.list.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                {"isStaff" in item ? (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white uppercase">
                    {item.title.substring(0, 2)}
                  </div>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-normal">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground">{item.sub}</div>
                </div>
              </div>
              <StatusBadge tone={item.tagTone}>{item.value}</StatusBadge>
            </div>
          ))}
        </div>
      </FormSection>

      {activeAlert.detail.ai && (
        <div className="mt-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
            <div className="space-y-1">
              <div className="text-xs font-semibold text-teal-950 dark:text-teal-50">
                {activeAlert.detail.ai.title}
              </div>
              <p className="text-[11px] text-teal-800 dark:text-teal-200 leading-relaxed">
                {activeAlert.detail.ai.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              openAiDrawer();
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open in assistant
          </button>
        </div>
      )}
    </DrawerShell>
  );
}
