import * as React from "react";
import { Calendar, Mail, MessageSquare, MoreHorizontal, Phone } from "lucide-react";
import { getStaffContactLinks } from "../lib/staffContactActions";
import type { StaffRow } from "../types";

interface StaffProfileQuickActionsProps {
  member: StaffRow;
  source: "live" | "demo";
}

const actionClass =
  "flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted/60";

export function StaffProfileQuickActions({ member, source }: StaffProfileQuickActionsProps) {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  function showDemoToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }

  if (source === "live") {
    const { emailHref, phoneHref } = getStaffContactLinks({
      email: member.e,
      phone: member.phone,
    });

    if (!emailHref && !phoneHref) return null;

    return (
      <div className="flex items-center gap-1.5">
        {phoneHref && (
          <a href={phoneHref} aria-label={`Call ${member.n}`} title="Call" className={actionClass}>
            <Phone className="size-3.5" aria-hidden />
          </a>
        )}
        {emailHref && (
          <a
            href={emailHref}
            aria-label={`Email ${member.n}`}
            title="Email"
            className={actionClass}
          >
            <Mail className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    );
  }

  const demoActions = [
    [MessageSquare, "Message", () => showDemoToast(`Message ${member.n}`)],
    [Phone, "Call", () => showDemoToast(`Call ${member.n}`)],
    [Mail, "Email", () => showDemoToast(`Email ${member.n}`)],
    [Calendar, "View rota", () => showDemoToast("Opening rota")],
    [MoreHorizontal, "More actions", () => showDemoToast("Actions menu")],
  ] as const;

  return (
    <div className="space-y-2">
      {toastMessage && (
        <div className="rounded-xl bg-info-soft px-3 py-2 text-xs font-medium text-info">
          {toastMessage}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        {demoActions.map(([Icon, label, handler]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={handler}
            title={label}
            className={actionClass}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
