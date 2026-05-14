export interface StaffRow {
  id: string;
  name: string;
  n: string;
  e: string;
  role: string;
  sub: string;
  dept: string;
  status: string;
  contract: string;
  avail: string;
  availTone: "high" | "med" | "off";
  img: number;
  active?: boolean;
  statusTone?: "info" | "purple";
  portalStatus?: "Claimed" | "Pending" | "Not invited";
}

// Extended manager-only profile data — never exposed to staff portal
export interface StaffProfileShift {
  date: string;
  time: string;
  dept: string;
  role: string;
  location?: string;
  notes?: string;
  status?: string;
}

export interface StaffProfileDocument {
  name: string;
  type: string;
  expiry?: string;
  status: "valid" | "expiring" | "expired" | "missing";
}

export interface StaffProfileNote {
  date: string;
  author: string;
  type: string;
  text: string;
  visibleToStaff: boolean;
}

export interface StaffProfileActivity {
  date: string;
  type: string;
  note: string;
}

export interface StaffProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  sub: string;
  dept: string;
  status: string;
  contract: string;
  contractedHours: string;
  startDate: string;
  img: number;
  employmentType: string;
  emergencyContact: string;
  skills: string[];
  flags: string[];
  managerSnapshot: string[];
  nextShift: StaffProfileShift;
  recentActivity: StaffProfileActivity[];
  documentsSummary: { total: number; expiringSoon: number; missing: number };
  documents: StaffProfileDocument[];
  availability: {
    updated: string;
    conflicts: number;
    lateChanges: number;
    usuallyAvailable: string;
  };
  scheduleStats: { preferredDays: string[]; preferredShifts: string[]; avoidIfPossible: string[] };
  workloadBalance: {
    hoursThisWeek: number;
    avgLast4Weeks: number;
    consecutiveShifts: number;
    restGap: string;
    weekendLoad: string;
    overtimeTrend: string;
  };
  leaveAbsence: {
    annualLeaveRemaining: number;
    sickDaysThisYear: number;
    sickDaysThisMonth: number;
    sickDaysLast90: number;
    sicknessEpisodes: number;
    shortNoticeAbsences: number;
    returnToWorkRequired: boolean;
    fitNoteRequired: boolean;
  };
  timeStats: {
    hoursThisWeek: number;
    avgWeeklyHours: number;
    hoursThisMonth: number;
    overtimeThisMonth: number;
  };
  portalAccess: { status: string; lastLogin: string };
  notes: StaffProfileNote[];
  upcomingShifts: StaffProfileShift[];
  recentShifts: StaffProfileShift[];
  roleCoverage?: Array<{ label: string; value: number }>;
  breakSummary?: { averageBreak: string; missedBreaks: number; complianceStatus: string };
  insights: {
    attendanceRate: number;
    onTimeStarts: number;
    lateClockIns: number;
    noShows: number;
    avgWeeklyHours: number;
    consecutiveShifts: number;
    restGap: string;
    weekendLoad: string;
    overtimeTrend: string;
    sickDaysLast30: number;
    sickDaysLast90: number;
    sicknessEpisodesThisYear: number;
    shortNoticeAbsenceCount: number;
    roleFit: string;
    preferredShifts: string;
    departmentFit: string;
    availabilityMatch: string;
    certificationsStatus: string;
  };
}
