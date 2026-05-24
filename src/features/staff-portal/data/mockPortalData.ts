import type {
  ApprovedLeave,
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
  department: "The Harbor View · Front of house",
  email: "olivia.bennett@docklist.example",
  phone: "+44 7700 900123",
  accessStatus: "active",
  manager: {
    name: "Sophie Martin",
    email: "sophie.martin@docklist.example",
    phone: "+44 7700 900456",
  },
};

export const mockNextShift: PortalShift = {
  id: "sh-001",
  date: "2026-05-11",
  dayLabel: "Today · Fri 10 May",
  start: "08:30",
  end: "16:30",
  hours: 8,
  role: "Server",
  station: "The Harbor View",
  breakMinutes: 30,
  status: "confirmed",
  shiftNote: "Please arrive 10 minutes early and check in with the duty manager.",
  managerName: "Sophie Martin",
  tasks: [
    { id: "t1", label: "Review specials & menu updates", done: true },
    { id: "t2", label: "Check opening sidework list", done: true },
    { id: "t3", label: "Set up patio station", done: true },
    { id: "t4", label: "Stock water & glassware", done: true },
    { id: "t5", label: "Team brief at 08:15", done: false },
  ],
  teammates: [
    { id: "tm1", name: "Jamie L.", initials: "JL", role: "Manager" },
    { id: "tm2", name: "Tyler S.", initials: "TS", role: "Bartender" },
    { id: "tm3", name: "Riley M.", initials: "RM", role: "Server" },
    { id: "tm4", name: "Jordan K.", initials: "JK", role: "Server" },
    { id: "tm5", name: "Casey N.", initials: "CN", role: "Runner" },
  ],
};

export const mockWeekShifts: PortalShift[] = [
  mockNextShift,
  {
    id: "sh-002",
    date: "2026-05-11",
    dayLabel: "Sat 11 May",
    start: "17:00",
    end: "22:00",
    hours: 5,
    role: "Bartender",
    station: "The Harbor View",
    breakMinutes: 30,
    status: "changed",
    shiftNote: "Start moved 30 minutes later.",
  },
  {
    id: "sh-003",
    date: "2026-05-12",
    dayLabel: "Sun 12 May",
    start: "11:00",
    end: "16:00",
    hours: 5,
    role: "Runner",
    station: "The Bay Bistro",
    breakMinutes: 30,
    status: "confirmed",
  },
  {
    id: "sh-004",
    date: "2026-05-13",
    dayLabel: "Mon 13 May",
    start: "12:00",
    end: "20:00",
    hours: 8,
    role: "Server",
    station: "The Harbor View",
    breakMinutes: 30,
    status: "confirmed",
  },
  {
    id: "sh-005",
    date: "2026-05-14",
    dayLabel: "Tue 14 May",
    start: "18:00",
    end: "22:00",
    hours: 4,
    role: "Server",
    station: "The Harbor View",
    breakMinutes: 15,
    status: "confirmed",
  },
];

export const mockOpenShifts: PortalShift[] = [
  {
    id: "open-1",
    date: "2026-05-11",
    dayLabel: "Sat 11 May",
    start: "17:00",
    end: "22:00",
    hours: 5,
    role: "Bartender",
    station: "The Harbor View",
    breakMinutes: 30,
    status: "open",
  },
  {
    id: "open-2",
    date: "2026-05-12",
    dayLabel: "Sun 12 May",
    start: "11:00",
    end: "16:00",
    hours: 5,
    role: "Runner",
    station: "The Bay Bistro",
    breakMinutes: 30,
    status: "open",
  },
];

export const mockPastShifts: PortalShift[] = [
  {
    id: "past-1",
    date: "2026-05-04",
    dayLabel: "Sat 4 May",
    start: "12:00",
    end: "20:00",
    hours: 8,
    role: "Server",
    station: "The Harbor View",
    breakMinutes: 30,
    status: "confirmed",
  },
  {
    id: "past-2",
    date: "2026-05-02",
    dayLabel: "Thu 2 May",
    start: "17:00",
    end: "23:00",
    hours: 6,
    role: "Server",
    station: "The Harbor View",
    breakMinutes: 30,
    status: "confirmed",
  },
];

export const mockWeeklySummary: WeeklySummary = {
  shifts: 3,
  hours: 24.5,
  openShifts: 2,
};

export const mockClockEntries: ClockEntry[] = [
  {
    id: "ce-001",
    dayLabel: "Sat 9 May",
    clockIn: "11:58",
    clockOut: "23:34",
    breakMinutes: 60,
    totalHours: 10.6,
  },
  {
    id: "ce-002",
    dayLabel: "Fri 8 May",
    clockIn: "17:02",
    clockOut: "00:18",
    breakMinutes: 30,
    totalHours: 6.8,
  },
  {
    id: "ce-003",
    dayLabel: "Wed 6 May",
    clockIn: "16:55",
    clockOut: null,
    breakMinutes: 0,
    totalHours: null,
    flag: "missing-clock-out",
  },
];

export const mockRequests: PortalRequest[] = [
  {
    id: "rq-001",
    kind: "time-off",
    title: "Time off · 22–24 May",
    detail: "3 days, family wedding.",
    submitted: "Submitted 2 May",
    status: "pending",
  },
  {
    id: "rq-002",
    kind: "availability",
    title: "Availability · No Mondays",
    detail: "Cannot work Monday evenings from June.",
    submitted: "Submitted 28 Apr",
    status: "approved",
    managerResponse: "Approved. Please check the rota when it is republished.",
  },
  {
    id: "rq-003",
    kind: "shift-question",
    title: "Shift question · 15 May",
    detail: "Asked to confirm garden bar cover.",
    submitted: "Submitted 1 May",
    status: "declined",
    managerResponse: "Thanks. Please check the published rota and follow up if needed.",
  },
];

export const mockNotices: PortalNotice[] = [
  {
    id: "no-001",
    title: "New summer cocktail menu",
    body: "Tasting session this Thursday before service. New menu launches Friday.",
    postedBy: "Sophie Martin",
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
    title: "Bank holiday rota published",
    body: "Late May bank holiday rota is live. Please check your shifts.",
    postedBy: "Sophie Martin",
    postedAt: "Posted 3 days ago",
    acknowledged: true,
  },
];

export const mockLeaveBalances: LeaveBalance[] = [
  { label: "Annual leave", days: 12.5, unit: "days", tone: "brand" },
  { label: "Personal", days: 3.0, unit: "days", tone: "purple" },
  { label: "Sick leave", days: 5.0, unit: "days", tone: "info" },
];

export const mockApprovedLeave: ApprovedLeave[] = [
  {
    id: "al-1",
    rangeLabel: "Mon 27 May – Fri 31 May",
    type: "Annual leave",
    days: 5,
  },
];

export const mockAvailability: AvailabilityDay[] = [
  { shortLabel: "Mon", date: "13", status: "available" },
  { shortLabel: "Tue", date: "14", status: "available" },
  { shortLabel: "Wed", date: "15", status: "limited" },
  { shortLabel: "Thu", date: "16", status: "available" },
  { shortLabel: "Fri", date: "17", status: "off" },
  { shortLabel: "Sat", date: "18", status: "available" },
  { shortLabel: "Sun", date: "19", status: "available" },
];

export const mockNotifications: PortalNotification[] = [
  {
    id: "nt-1",
    kind: "shift-changed",
    title: "Your shift has been changed",
    body: "Your Saturday 11 May shift is now 17:00 – 22:00 at The Harbor View.",
    postedAt: "Today, 08:42",
    badge: { tone: "warning", label: "Changed" },
    unread: true,
    important: true,
  },
  {
    id: "nt-2",
    kind: "leave-approved",
    title: "Leave approved",
    body: "Your annual leave request for 27 – 31 May has been approved.",
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
    title: "Staff Handbook",
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
    meta: "PDF · 512 KB · Expires 10 May 2025",
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

export const mockTeamOnDuty: TeamOnDuty[] = [
  {
    id: "td-1",
    name: "Sophie Martin",
    initials: "SM",
    role: "Restaurant Manager",
    shiftLabel: "08:00 – 16:00",
    isManagerOnDuty: true,
  },
  {
    id: "td-2",
    name: "Alex Turner",
    initials: "AT",
    role: "Server",
    shiftLabel: "08:30 – 16:30",
  },
  {
    id: "td-3",
    name: "Maya Patel",
    initials: "MP",
    role: "Bartender",
    shiftLabel: "12:00 – 20:00",
  },
  {
    id: "td-4",
    name: "James Lee",
    initials: "JL",
    role: "Runner",
    shiftLabel: "11:00 – 16:00",
  },
];
