import { Megaphone, Users, Shield, GraduationCap, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TeamAnnouncement, TeamTrainingReminder, Tone } from "../types";
import { isAwaitingAcknowledgement } from "./teamPresentation";

/**
 * Icon and tone are derived from what a record actually IS, replacing the
 * per-fixture icons the demo carried. A department broadcast looks different
 * from an all-staff one because it is different, not because a fixture said so.
 */
export function announcementIcon(announcement: TeamAnnouncement): LucideIcon {
  if (announcement.audienceKind === "managers") return Shield;
  if (announcement.audienceKind === "department") return Users;
  return Megaphone;
}

export function announcementTone(announcement: TeamAnnouncement): Tone {
  if (isAwaitingAcknowledgement(announcement)) return "warning";
  if (announcement.pinned) return "purple";
  return "info";
}

export function trainingIcon(reminder: TeamTrainingReminder): LucideIcon {
  return reminder.mandatory ? Shield : GraduationCap;
}

export function trainingTone(reminder: TeamTrainingReminder): Tone {
  if (reminder.status === "completed") return "success";
  return reminder.mandatory ? "warning" : "info";
}

export function eventIcon(): LucideIcon {
  return CalendarDays;
}
