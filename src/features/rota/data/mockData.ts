import type { DraftShift, ShiftTone, StaffMember } from "../types";

export const staff: StaffMember[] = [
  { id: "sophie-carter", name: "Sophie Carter", role: "Manager", hrs: "32h", img: 5, tone: "info" },
  {
    id: "daniel-mitchell",
    name: "Daniel Mitchell",
    role: "Supervisor",
    hrs: "35h",
    img: 12,
    tone: "info",
  },
  {
    id: "priya-patel",
    name: "Priya Patel",
    role: "Head Chef",
    hrs: "40h",
    img: 47,
    tone: "warning",
  },
  {
    id: "liam-oconnor",
    name: "Liam O'Connor",
    role: "Bartender",
    hrs: "25h",
    img: 13,
    tone: "warning",
  },
  {
    id: "olivia-bennett",
    name: "Olivia Bennett",
    role: "Barista",
    hrs: "20h",
    img: 16,
    tone: "info",
  },
  {
    id: "james-walker",
    name: "James Walker",
    role: "Waiting Staff",
    hrs: "20h",
    img: 14,
    tone: "purple",
  },
  {
    id: "amelia-stone",
    name: "Amelia Stone",
    role: "Housekeeping",
    hrs: "30h",
    img: 23,
    tone: "danger",
  },
  { id: "noah-evans", name: "Noah Evans", role: "Porter", hrs: "15h", img: 33, tone: "success" },
];

export type SeedShift = Omit<DraftShift, "id">;

const sched = (
  staffId: string | null,
  dayIndex: number,
  role: string,
  start: string,
  end: string,
  tone: ShiftTone,
  status: SeedShift["status"] = "scheduled",
): SeedShift => ({
  staffId,
  dayIndex: dayIndex as SeedShift["dayIndex"],
  role,
  start,
  end,
  tone,
  status,
});

export const initialDraftShifts: SeedShift[] = [
  // Sophie Carter — Manager (Mon–Sat)
  sched("sophie-carter", 0, "Manager", "08:00", "16:00", "info"),
  sched("sophie-carter", 1, "Manager", "08:00", "16:00", "info"),
  sched("sophie-carter", 2, "Manager", "09:00", "17:00", "info"),
  sched("sophie-carter", 3, "Manager", "08:00", "16:00", "info"),
  sched("sophie-carter", 4, "Manager", "08:00", "16:00", "info"),
  sched("sophie-carter", 5, "Manager", "10:00", "18:00", "info"),

  // Daniel Mitchell — Supervisor (Fri has a local overlap for conflict review)
  sched("daniel-mitchell", 0, "Supervisor", "09:00", "17:00", "info"),
  sched("daniel-mitchell", 1, "Supervisor", "09:00", "17:00", "info"),
  sched("daniel-mitchell", 3, "Supervisor", "13:00", "21:00", "info"),
  sched("daniel-mitchell", 4, "Supervisor", "13:00", "21:00", "info"),
  sched("daniel-mitchell", 4, "Supervisor", "18:00", "22:00", "info"),
  sched("daniel-mitchell", 5, "Supervisor", "13:00", "21:00", "info"),
  sched("daniel-mitchell", 6, "Supervisor", "09:00", "17:00", "info"),

  // Priya Patel — Head Chef (Thu off)
  sched("priya-patel", 0, "Head Chef", "06:00", "14:00", "warning"),
  sched("priya-patel", 1, "Head Chef", "06:00", "14:00", "warning"),
  sched("priya-patel", 2, "Head Chef", "06:00", "14:00", "warning"),
  sched("priya-patel", 4, "Head Chef", "06:00", "14:00", "warning"),
  sched("priya-patel", 5, "Head Chef", "06:00", "14:00", "warning"),
  sched("priya-patel", 6, "Head Chef", "06:00", "14:00", "warning"),

  // Liam O'Connor — Bartender (Fri now uncovered → open shift)
  sched("liam-oconnor", 0, "Bartender", "16:00", "00:00", "warning"),
  sched("liam-oconnor", 1, "Bartender", "16:00", "00:00", "warning"),
  sched("liam-oconnor", 2, "Bartender", "16:00", "00:00", "warning"),
  sched("liam-oconnor", 5, "Bartender", "16:00", "00:00", "warning"),
  sched("liam-oconnor", 6, "Bartender", "16:00", "00:00", "warning"),

  // Olivia Bennett — Barista
  sched("olivia-bennett", 0, "Barista", "07:00", "15:00", "info"),
  sched("olivia-bennett", 2, "Barista", "07:00", "15:00", "info"),
  sched("olivia-bennett", 3, "Barista", "07:00", "15:00", "info"),
  sched("olivia-bennett", 5, "Barista", "08:00", "16:00", "info"),
  sched("olivia-bennett", 6, "Barista", "08:00", "16:00", "info"),

  // James Walker — Waiting Staff
  sched("james-walker", 0, "Waiter", "11:00", "19:00", "purple"),
  sched("james-walker", 1, "Waiter", "11:00", "19:00", "purple"),
  sched("james-walker", 3, "Waiter", "11:00", "19:00", "purple"),
  sched("james-walker", 4, "Waiter", "11:00", "19:00", "purple"),
  sched("james-walker", 5, "Waiter", "11:00", "19:00", "purple"),

  // Amelia Stone — Housekeeping (Fri off)
  sched("amelia-stone", 0, "Housekeeping", "09:00", "17:00", "danger"),
  sched("amelia-stone", 1, "Housekeeping", "09:00", "17:00", "danger"),
  sched("amelia-stone", 2, "Housekeeping", "09:00", "17:00", "danger"),
  sched("amelia-stone", 3, "Housekeeping", "09:00", "17:00", "danger"),
  sched("amelia-stone", 5, "Housekeeping", "09:00", "17:00", "danger"),
  sched("amelia-stone", 6, "Housekeeping", "09:00", "17:00", "danger"),

  // Noah Evans — Porter (Fri now uncovered → open shift)
  sched("noah-evans", 0, "Porter", "07:00", "15:00", "success"),
  sched("noah-evans", 1, "Porter", "07:00", "15:00", "success"),
  sched("noah-evans", 3, "Porter", "07:00", "15:00", "success"),
  sched("noah-evans", 5, "Porter", "07:00", "15:00", "success"),

  // Open shifts (unassigned — staffId null)
  sched(null, 4, "Bartender", "16:00", "00:00", "open", "open"),
  sched(null, 4, "Porter", "07:00", "15:00", "open", "open"),
];

export const toneStyles: Record<string, string> = {
  info: "bg-info-soft/70 text-foreground border-info/20",
  warning: "bg-warning-soft/70 text-foreground border-warning/20",
  danger: "bg-danger-soft/70 text-foreground border-danger/20",
  purple: "bg-accent-purple-soft/70 text-foreground border-accent-purple/20",
  success: "bg-success-soft/70 text-foreground border-success/20",
  open: "bg-warning-soft/70 text-warning-700 border-dashed border-warning/60",
  off: "bg-transparent text-muted-foreground border-transparent",
};

export const roleLegend = [
  { label: "Management", tone: "info" },
  { label: "Kitchen", tone: "warning" },
  { label: "Bar", tone: "warning" },
  { label: "Service", tone: "purple" },
  { label: "Housekeeping", tone: "danger" },
  { label: "Porter", tone: "success" },
];
