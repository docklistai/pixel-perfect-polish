export type PortalTab = "home" | "schedule" | "clock" | "requests" | "notices" | "profile";

export type ShiftStatus = "confirmed" | "open" | "changed";

export interface PortalShift {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  dayLabel: string; // e.g. "Mon 12 May"
  start: string; // "16:00"
  end: string; // "23:30"
  hours: number;
  role: string;
  station: string;
  breakMinutes: number;
  status: ShiftStatus;
  note?: string;
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
export type RequestStatus = "pending" | "approved" | "declined";

export interface PortalRequest {
  id: string;
  kind: RequestKind;
  title: string;
  detail: string;
  submitted: string; // human label
  status: RequestStatus;
  managerNote?: string;
}

export interface PortalNotice {
  id: string;
  title: string;
  body: string;
  postedBy: string;
  postedAt: string; // human label
  pinned?: boolean;
  unread?: boolean;
  needsAck?: boolean;
  acknowledged?: boolean;
}

export interface PortalProfile {
  name: string;
  initials: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  accessStatus: "active" | "pending" | "suspended";
  manager: { name: string; email: string; phone: string };
}

export interface WeeklySummary {
  shifts: number;
  hours: number;
}
