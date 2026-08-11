export type PortalTab = "home" | "shifts" | "time" | "leave" | "more";

export type ShiftsSubTab = "upcoming" | "requests" | "history";

export type ShiftStatus = "confirmed" | "open" | "changed";

export interface PortalShift {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  dayLabel: string; // e.g. "Thu 11 Jun"
  start: string; // "16:00"
  end: string; // "23:30"
  hours: number;
  role: string;
  station: string;
  /**
   * The department this shift was actually scheduled in — taken from the
   * published shift, not from the staff member's profile, so a shift covered
   * in another department reads correctly.
   */
  department?: string | null;
  breakMinutes: number;
  status: ShiftStatus;
  shiftNote?: string;
  managerName?: string;
  tasks?: { id: string; label: string; done?: boolean }[];
  teammates?: { id: string; name: string; initials: string; role: string }[];
  sourceSnapshotVersion?: number;
  publishedAt?: string;
  /** Authoritative live instants; demo rows omit them. */
  startsAtMs?: number;
  endsAtMs?: number;
}

export interface ClockEntry {
  id: string;
  dayLabel: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  totalHours: number | null;
  flag?: "missing-clock-out" | "late-in" | null;
}

export type RequestKind = "time-off" | "availability" | "shift-question";
export type RequestStatus = "pending" | "approved" | "declined" | "cancelled";

export interface PortalRequest {
  id: string;
  kind: RequestKind;
  title: string;
  detail: string;
  submitted: string;
  status: RequestStatus;
  managerResponse?: string;
}

export interface PortalNotice {
  id: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string;
  pinned?: boolean;
  unread?: boolean;
  needsAck?: boolean;
  acknowledged?: boolean;
}

export interface PortalProfile {
  staffId: string;
  name: string;
  initials: string;
  role: string;
  department: string;
  /** The workspace/business the staff member belongs to. */
  workspaceName: string;
  email: string;
  phone: string;
  accessStatus: "active" | "pending" | "suspended";
  manager: { name: string; email: string; phone: string };
  /** IANA timezone of the staff member's venue (primary location, workspace fallback). */
  timezone: string;
}

export interface WeeklySummary {
  shifts: number;
  hours: number;
  openShifts: number;
}

export interface LeaveBalance {
  label: string;
  days: number;
  unit: "days";
  tone: "brand" | "info" | "purple" | "success" | "warning";
}

export interface AvailabilityDay {
  shortLabel: string;
  date: string;
  status: "available" | "limited" | "off";
}

export type NotificationKind =
  | "shift-changed"
  | "rota-published"
  | "leave-approved"
  | "leave-declined"
  | "leave-cancelled"
  | "announcement"
  // Phase 55 emits these to staff: a nudge for an unread announcement, and a
  // due training reminder. They are labelled distinctly so a training nudge is
  // never presented as a new announcement.
  | "announcement-reminder"
  | "training-reminder"
  | "timesheet-reminder"
  | "open-shift-update"
  | "shift-release-update"
  | "unavailability-update";

export type NotificationCategory = "all" | "unread" | "important";

export interface PortalNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  postedAt: string;
  badge?: { tone: "warning" | "success" | "info" | "danger"; label: string };
  unread?: boolean;
  important?: boolean;
  relatedLeaveRequestId?: string;
}

export interface PortalDocument {
  id: string;
  title: string;
  category: "Required" | "Certificates" | "Training";
  meta: string;
  status: "Up to date" | "Expires soon" | "Valid";
}

export interface TeamOnDuty {
  id: string;
  name: string;
  initials: string;
  role: string;
  shiftLabel: string;
  isManagerOnDuty?: boolean;
}

export type MoreSection = "profile" | "team" | "documents" | "settings" | "help" | null;
