import {
  AlertCircle,
  AlertTriangle,
  CalendarOff,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import type { ManagerNotificationRecord } from "../api/managerNotifications";
import type { ManagerNotification, NotificationTone } from "@/components/notificationData";

type Presentation = {
  icon: LucideIcon;
  tone: NotificationTone;
  action: string;
  to: ManagerNotification["to"];
};

function presentationFor(record: ManagerNotificationRecord): Presentation {
  switch (record.relatedEntityType) {
    case "leave_request":
      return { icon: CalendarOff, tone: "purple", action: "Review leave", to: "/leave" };
    case "shift_release_request":
      return { icon: AlertTriangle, tone: "amber", action: "Review release", to: "/rota" };
    case "one_off_unavailability":
      return { icon: CalendarOff, tone: "purple", action: "Review request", to: "/staff" };
    case "rota_week":
      return { icon: AlertCircle, tone: "red", action: "Update rota", to: "/rota" };
    default:
      if (record.kind === "rota_update_required") {
        return { icon: AlertCircle, tone: "red", action: "Update rota", to: "/rota" };
      }
      return { icon: CheckCircle, tone: "blue", action: "Open", to: "/" };
  }
}

function notificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function presentManagerNotification(record: ManagerNotificationRecord): ManagerNotification {
  const presentation = presentationFor(record);
  return {
    id: record.id,
    icon: presentation.icon,
    tone: presentation.tone,
    title: record.title,
    body: record.body,
    action: presentation.action,
    time: notificationTime(record.createdAt),
    read: record.readAt !== null,
    to: presentation.to,
    staffId: record.staffMemberId ?? undefined,
    staffSearch:
      record.relatedEntityType === "one_off_unavailability" ? { tab: "leave" } : undefined,
    rotaSearch:
      record.rotaWeekOffset !== null && record.rotaLocationId
        ? { week: record.rotaWeekOffset, location: record.rotaLocationId }
        : undefined,
  };
}
