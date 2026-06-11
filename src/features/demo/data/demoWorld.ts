export const DEMO_WORLD = {
  todayIso: "2026-06-11",
  todayLabel: "Thu 11 Jun 2026",
  todayShortLabel: "Thu 11 Jun",
  /** Frozen demo time of day — mid-afternoon, inside Olivia's 07:00–15:00 shift. */
  nowLabel: "13:00",
  nowMinutes: 13 * 60,
  workspace: { id: "harbour-view", name: "Harbour View Hotel", location: "Brighton" },
  manager: {
    id: "alex-thompson",
    name: "Alex Thompson",
    email: "alex@harbourview.co.uk",
    password: "Docklist2026",
    phone: "+44 7700 900456",
  },
  weeks: {
    previous: { offset: -1, label: "1–7 Jun", startIso: "2026-06-01", state: "published" },
    current: { offset: 0, label: "8–14 Jun", startIso: "2026-06-08", state: "published" },
    next: {
      offset: 1,
      label: "15–21 Jun",
      startIso: "2026-06-15",
      state: "draft",
      dueLabel: "Fri 12 Jun, 16:00",
    },
  },
  headcount: { total: 8, scheduledToday: 6 },
  rota: { conflictCount: 1, openShiftCount: 2, coveragePercent: 96 },
  labour: {
    scheduledHours: 348,
    labourCost: 5291,
    projectedSales: 18500,
    labourPercent: 28.6,
    salesPerLabourPound: 3.5,
    fourWeekHours: 1368,
    fourWeekCost: 20840,
  },
} as const;

export const DEMO_STAFF = [
  {
    id: "sophie-carter",
    name: "Sophie Carter",
    role: "FOH Supervisor",
    department: "Front of House",
  },
  {
    id: "daniel-mitchell",
    name: "Daniel Mitchell",
    role: "Kitchen Supervisor",
    department: "Kitchen",
  },
  { id: "priya-patel", name: "Priya Patel", role: "Head Chef", department: "Kitchen" },
  { id: "liam-oconnor", name: "Liam O'Connor", role: "Bartender", department: "Bar" },
  { id: "olivia-bennett", name: "Olivia Bennett", role: "Barista", department: "Front of House" },
  { id: "james-walker", name: "James Walker", role: "Waiter", department: "Front of House" },
  { id: "amelia-stone", name: "Amelia Stone", role: "Housekeeper", department: "Housekeeping" },
  { id: "noah-evans", name: "Noah Evans", role: "Porter", department: "Maintenance" },
] as const;
