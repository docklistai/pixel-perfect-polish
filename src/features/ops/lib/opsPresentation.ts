import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ListChecks,
  StickyNote,
  Wrench,
} from "lucide-react";
import type { Tone } from "@/components/dl";
import type { OpsEntryType, OpsPriority, OpsStatus } from "../types";

export const ENTRY_TYPE_LABEL: Record<OpsEntryType, string> = {
  task: "Task",
  incident: "Incident",
  maintenance: "Maintenance",
  service_request: "Service request",
  note: "Note",
};
export const ENTRY_TYPE_ICON = {
  task: ListChecks,
  incident: AlertTriangle,
  maintenance: Wrench,
  service_request: ClipboardCheck,
  note: StickyNote,
} satisfies Record<OpsEntryType, typeof FileText>;
export const STATUS_LABEL: Record<OpsStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  archived: "Archived",
};
export const STATUS_TONE: Record<OpsStatus, Tone> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
  archived: "muted",
};
export const PRIORITY_TONE: Record<OpsPriority, Tone> = {
  low: "muted",
  normal: "info",
  high: "warning",
  critical: "danger",
};

export function formatOpsTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}

export function formatOpsDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export const resolvedIcon = CheckCircle2;

export function isOpsTaskType(type: OpsEntryType): boolean {
  return type !== "incident";
}
