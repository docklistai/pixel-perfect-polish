import type {
  AvailabilityDay,
  ClockEntry,
  LeaveBalance,
  PortalDocument,
  PortalNotice,
  PortalNotification,
  PortalProfile,
  PortalRequest,
  PortalShift,
  TeamOnDuty,
  WeeklySummary,
} from "../types";

export const mockProfile: PortalProfile = {
  staffId: "olivia-bennett",
  name: "Olivia Bennett",
  initials: "OB",
  role: "Barista",
  department: "Harbour View Hotel · Front of House",
  workspaceName: "Harbour View Hotel",
  email: "olivia.bennett@harbourview.co.uk",
  phone: "+44 7700 900123",
  accessStatus: "active",
  manager: {
    name: "Alex Thompson",
    email: "alex@harbourview.co.uk",
    phone: "+44 7700 900456",
  },
};

export const mockPastShifts: PortalShift[] = [
  {
    id: "past-1",
    date: "2026-06-06",
    dayLabel: "Sat 6 Jun",
    start: "12:00",
    end: "20:00",
    hours: 8,
    role: "Barista",
    station: "Harbour View Hotel",
    breakMinutes: 30,
    status: "confirmed",
  },
  {
    id: "past-2",
    date: "2026-06-04",
    dayLabel: "Thu 4 Jun",
    start: "17:00",
    end: "23:00",
    hours: 6,
    role: "Barista",
    station: "Harbour View Hotel",
    breakMinutes: 30,
    status: "confirmed",
  },
];

export const mockClockEntries: ClockEntry[] = [
  {
    id: "ce-001",
    dayLabel: "Sat 6 Jun",
    clockIn: "11:58",
    clockOut: "23:34",
    breakMinutes: 60,
    totalHours: 10.6,
  },
  {
    id: "ce-002",
    dayLabel: "Fri 5 Jun",
    clockIn: "17:02",
    clockOut: "00:18",
    breakMinutes: 30,
    totalHours: 6.8,
  },
  {
    id: "ce-003",
    dayLabel: "Wed 3 Jun",
    clockIn: "16:55",
    clockOut: null,
    breakMinutes: 0,
    totalHours: null,
    flag: "missing-clock-out",
  },
];

export const mockRequests: PortalRequest[] = [
  {
    id: "rq-002",
    kind: "availability",
    title: "Availability · No Monday evenings from July",
    detail: "Monday daytime remains available.",
    submitted: "Submitted 26 May",
    status: "approved",
    managerResponse: "Approved. Please check the rota when it is republished.",
  },
  {
    id: "rq-003",
    kind: "shift-question",
    title: "Shift question · 5 Jun",
    detail: "Asked to confirm garden bar cover.",
    submitted: "Submitted 8 Jun",
    status: "declined",
    managerResponse: "Thanks. Please check the published rota and follow up if needed.",
  },
];

export const mockNotices: PortalNotice[] = [
  {
    id: "no-001",
    title: "New summer cocktail menu",
    body: "Tasting session this Thursday before service. New menu launches Friday.",
    postedBy: "Alex Thompson",
    postedAt: "Posted 2 hours ago",
    pinned: true,
    unread: true,
    needsAck: true,
  },
  {
    id: "no-002",
    title: "Glassware handling refresher",
    body: "Reminder to read the updated breakage and safety guidance in the team folder.",
    postedBy: "Operations",
    postedAt: "Posted yesterday",
    unread: true,
    needsAck: true,
  },
  {
    id: "no-003",
    title: "Current rota published",
    body: "The rota for 8–14 Jun is live. Next week's rota is still a manager draft.",
    postedBy: "Alex Thompson",
    postedAt: "Posted 3 days ago",
    acknowledged: true,
  },
];

export const mockLeaveBalances: LeaveBalance[] = [
  { label: "Annual leave", days: 12.5, unit: "days", tone: "brand" },
  { label: "Personal", days: 3.0, unit: "days", tone: "purple" },
  { label: "Sick leave", days: 5.0, unit: "days", tone: "info" },
];

export const mockAvailability: AvailabilityDay[] = [
  { shortLabel: "Mon", date: "15", status: "limited" },
  { shortLabel: "Tue", date: "16", status: "available" },
  { shortLabel: "Wed", date: "17", status: "limited" },
  { shortLabel: "Thu", date: "18", status: "available" },
  { shortLabel: "Fri", date: "19", status: "off" },
  { shortLabel: "Sat", date: "20", status: "available" },
  { shortLabel: "Sun", date: "21", status: "available" },
];

export const mockNotifications: PortalNotification[] = [
  {
    id: "nt-1",
    kind: "shift-changed",
    title: "Your shift has been changed",
    body: "Your Saturday 13 Jun shift is confirmed at Harbour View Hotel.",
    postedAt: "Today, 08:42",
    badge: { tone: "warning", label: "Changed" },
    unread: true,
    important: true,
    relatedLeaveRequestId: "l6",
  },
  {
    id: "nt-2",
    kind: "leave-approved",
    title: "Leave approved",
    body: "Your annual leave request for 22 – 26 Jun has been approved.",
    postedAt: "Today, 07:15",
    badge: { tone: "success", label: "Approved" },
    unread: true,
    important: true,
  },
  {
    id: "nt-3",
    kind: "announcement",
    title: "Team briefing update",
    body: "Please join the team briefing at 09:45 in the staff room tomorrow.",
    postedAt: "Yesterday, 19:20",
    badge: { tone: "info", label: "New" },
    unread: true,
  },
  {
    id: "nt-4",
    kind: "timesheet-reminder",
    title: "Timesheet reminder",
    body: "You have 2 unsubmitted timesheets. Please submit by Sunday.",
    postedAt: "Yesterday, 09:00",
    badge: { tone: "warning", label: "Reminder" },
  },
];

export const mockDocuments: PortalDocument[] = [
  {
    id: "doc-1",
    title: "Olivia's Contract",
    category: "Required",
    meta: "PDF · 256 KB · Shared 2 Jan 2024",
    status: "Up to date",
  },
  {
    id: "doc-2",
    title: "Staff Handbook",
    category: "Required",
    meta: "PDF · 1.3 MB · Updated 8 Nov 2024",
    status: "Up to date",
  },
  {
    id: "doc-3",
    title: "Food Safety Certificate",
    category: "Certificates",
    meta: "PDF · 512 KB · Expires 10 May 2027",
    status: "Valid",
  },
  {
    id: "doc-4",
    title: "Training Records",
    category: "Training",
    meta: "PDF · 1.1 MB · Updated 5 Apr 2024",
    status: "Up to date",
  },
];
