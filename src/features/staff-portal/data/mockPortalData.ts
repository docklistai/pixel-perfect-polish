import type {
  ClockEntry,
  PortalNotice,
  PortalProfile,
  PortalRequest,
  PortalShift,
  WeeklySummary,
} from "../types";

export const mockProfile: PortalProfile = {
  name: "Aisha Khan",
  initials: "AK",
  role: "Bartender",
  department: "Bar · Front of house",
  email: "aisha.khan@docklist.example",
  phone: "+44 7700 900123",
  accessStatus: "active",
  manager: {
    name: "Sophie Carter",
    email: "sophie.carter@docklist.example",
    phone: "+44 7700 900456",
  },
};

export const mockNextShift: PortalShift = {
  id: "sh-001",
  date: "2026-05-11",
  dayLabel: "Today · Mon 11 May",
  start: "16:00",
  end: "23:30",
  hours: 7.5,
  role: "Bartender",
  station: "Main bar",
  breakMinutes: 30,
  status: "confirmed",
  note: "Pre-service brief at 15:45.",
};

export const mockWeekShifts: PortalShift[] = [
  mockNextShift,
  {
    id: "sh-002",
    date: "2026-05-13",
    dayLabel: "Wed 13 May",
    start: "17:00",
    end: "23:00",
    hours: 6,
    role: "Bartender",
    station: "Garden bar",
    breakMinutes: 30,
    status: "confirmed",
  },
  {
    id: "sh-003",
    date: "2026-05-15",
    dayLabel: "Fri 15 May",
    start: "18:00",
    end: "00:30",
    hours: 6.5,
    role: "Bartender",
    station: "Main bar",
    breakMinutes: 30,
    status: "changed",
    note: "Start moved 30 min later.",
  },
  {
    id: "sh-004",
    date: "2026-05-16",
    dayLabel: "Sat 16 May",
    start: "12:00",
    end: "23:30",
    hours: 11.5,
    role: "Bartender",
    station: "Main bar",
    breakMinutes: 60,
    status: "confirmed",
  },
];

export const mockWeeklySummary: WeeklySummary = {
  shifts: mockWeekShifts.length,
  hours: mockWeekShifts.reduce((acc, s) => acc + s.hours, 0),
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
    managerNote: "Approved from 1 June.",
  },
  {
    id: "rq-003",
    kind: "shift-question",
    title: "Shift question · 15 May",
    detail: "Asked to confirm garden bar cover.",
    submitted: "Submitted 1 May",
    status: "declined",
    managerNote: "Already covered, thanks for asking.",
  },
];

export const mockNotices: PortalNotice[] = [
  {
    id: "no-001",
    title: "New summer cocktail menu",
    body: "Tasting session this Thursday before service. New menu launches Friday.",
    postedBy: "Sophie Carter",
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
    postedBy: "Sophie Carter",
    postedAt: "Posted 3 days ago",
    acknowledged: true,
  },
];
