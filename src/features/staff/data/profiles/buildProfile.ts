import type {
  StaffProfile,
  StaffProfileAbsenceEntry,
  StaffProfileActivity,
  StaffProfileDocument,
  StaffProfileLeaveEntry,
  StaffProfileNote,
  StaffProfileShift,
  StaffProfileTimeEntry,
} from "../../types";

export type ProfileSeed = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  sub?: string;
  dept: string;
  status?: string;
  contract?: string;
  contractedHours?: string;
  startDate?: string;
  img: number;
  employmentType?: string;
  emergencyContact?: string;
  skills?: string[];
  flags?: string[];
  managerSnapshot?: string[];
  nextShift?: StaffProfileShift;
  upcomingShifts?: StaffProfileShift[];
  recentShifts?: StaffProfileShift[];
  recentActivity?: StaffProfileActivity[];
  documents?: StaffProfileDocument[];
  notes?: StaffProfileNote[];
  availability?: Partial<StaffProfile["availability"]>;
  workloadBalance?: Partial<StaffProfile["workloadBalance"]>;
  timeStats?: Partial<StaffProfile["timeStats"]>;
  leaveAbsence?: Partial<StaffProfile["leaveAbsence"]>;
  insights?: Partial<StaffProfile["insights"]>;
  portalAccess?: Partial<StaffProfile["portalAccess"]>;
  scheduleStats?: Partial<StaffProfile["scheduleStats"]>;
  roleCoverage?: StaffProfile["roleCoverage"];
  breakSummary?: StaffProfile["breakSummary"];
  weeklyHours?: number[];
  timeEntries?: StaffProfileTimeEntry[];
  upcomingLeave?: StaffProfileLeaveEntry[];
  absenceHistory?: StaffProfileAbsenceEntry[];
};

const DEFAULT_INSIGHTS: StaffProfile["insights"] = {
  attendanceRate: 0,
  onTimeStarts: 0,
  lateClockIns: 0,
  noShows: 0,
  avgWeeklyHours: 0,
  consecutiveShifts: 0,
  restGap: "—",
  weekendLoad: "—",
  overtimeTrend: "—",
  sickDaysLast30: 0,
  sickDaysLast90: 0,
  sicknessEpisodesThisYear: 0,
  shortNoticeAbsenceCount: 0,
  roleFit: "—",
  preferredShifts: "—",
  departmentFit: "—",
  availabilityMatch: "—",
  certificationsStatus: "—",
};

export function buildProfile(seed: ProfileSeed): StaffProfile {
  const documents = seed.documents ?? [];
  const documentsSummary = {
    total: documents.length,
    expiringSoon: documents.filter((d) => d.status === "expiring").length,
    missing: documents.filter((d) => d.status === "missing").length,
  };
  const nextShift = seed.nextShift ?? {
    date: "No upcoming shifts",
    time: "",
    dept: seed.dept,
    role: seed.role,
  };
  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    phone: seed.phone ?? "—",
    role: seed.role,
    sub: seed.sub ?? "",
    dept: seed.dept,
    status: seed.status ?? "Active",
    contract: seed.contract ?? "Full-time",
    contractedHours: seed.contractedHours ?? "—",
    startDate: seed.startDate ?? "—",
    img: seed.img,
    employmentType: seed.employmentType ?? seed.contract ?? "Full-time",
    emergencyContact: seed.emergencyContact ?? "Not provided",
    skills: seed.skills ?? [],
    flags: seed.flags ?? [],
    managerSnapshot: seed.managerSnapshot ?? ["No manager notes recorded yet."],
    nextShift,
    recentActivity: seed.recentActivity ?? [],
    documentsSummary,
    documents,
    availability: {
      updated: seed.availability?.updated ?? "—",
      conflicts: seed.availability?.conflicts ?? 0,
      lateChanges: seed.availability?.lateChanges ?? 0,
      usuallyAvailable: seed.availability?.usuallyAvailable ?? "—",
    },
    scheduleStats: {
      preferredDays: seed.scheduleStats?.preferredDays ?? [],
      preferredShifts: seed.scheduleStats?.preferredShifts ?? [],
      avoidIfPossible: seed.scheduleStats?.avoidIfPossible ?? [],
    },
    workloadBalance: {
      hoursThisWeek: seed.workloadBalance?.hoursThisWeek ?? 0,
      avgLast4Weeks: seed.workloadBalance?.avgLast4Weeks ?? 0,
      consecutiveShifts: seed.workloadBalance?.consecutiveShifts ?? 0,
      restGap: seed.workloadBalance?.restGap ?? "—",
      weekendLoad: seed.workloadBalance?.weekendLoad ?? "—",
      overtimeTrend: seed.workloadBalance?.overtimeTrend ?? "—",
    },
    leaveAbsence: {
      annualLeaveRemaining: seed.leaveAbsence?.annualLeaveRemaining ?? 28,
      sickDaysThisYear: seed.leaveAbsence?.sickDaysThisYear ?? 0,
      sickDaysThisMonth: seed.leaveAbsence?.sickDaysThisMonth ?? 0,
      sickDaysLast90: seed.leaveAbsence?.sickDaysLast90 ?? 0,
      sicknessEpisodes: seed.leaveAbsence?.sicknessEpisodes ?? 0,
      shortNoticeAbsences: seed.leaveAbsence?.shortNoticeAbsences ?? 0,
      returnToWorkRequired: seed.leaveAbsence?.returnToWorkRequired ?? false,
      fitNoteRequired: seed.leaveAbsence?.fitNoteRequired ?? false,
    },
    timeStats: {
      hoursThisWeek: seed.timeStats?.hoursThisWeek ?? 0,
      avgWeeklyHours: seed.timeStats?.avgWeeklyHours ?? 0,
      hoursThisMonth: seed.timeStats?.hoursThisMonth ?? 0,
      overtimeThisMonth: seed.timeStats?.overtimeThisMonth ?? 0,
    },
    portalAccess: {
      status: seed.portalAccess?.status ?? "Active",
      lastLogin: seed.portalAccess?.lastLogin ?? "Never",
    },
    notes: seed.notes ?? [],
    upcomingShifts: seed.upcomingShifts ?? [],
    recentShifts: seed.recentShifts ?? [],
    roleCoverage: seed.roleCoverage,
    breakSummary: seed.breakSummary,
    weeklyHours: seed.weeklyHours,
    timeEntries: seed.timeEntries ?? [],
    upcomingLeave: seed.upcomingLeave ?? [],
    absenceHistory: seed.absenceHistory ?? [],
    insights: { ...DEFAULT_INSIGHTS, ...seed.insights },
  };
}
