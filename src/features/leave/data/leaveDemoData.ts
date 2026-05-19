import type { LeaveRequest, LeaveCalEntry } from "../types";

// Calendar covers Mon 18 May – Sun 31 May 2026 (two full weeks)
// Index 0 = Mon 18, Index 13 = Sun 31
export const CAL_DAYS = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F", "S", "S"];
export const CAL_DATES = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

export const requests: LeaveRequest[] = [
  {
    id: "sophie-carter",
    n: "Sophie Carter",
    role: "Manager",
    dept: "Front of House",
    date: "27 – 29 May 2026",
    dur: "3 days",
    impact: "Low",
    tone: "success",
    img: 5,
    balance: "14 days",
    submitted: "19 May 2026, 09:14 (Europe/London)",
    coverNote: "Front of House is covered by Daniel and James for these dates.",
  },
  {
    id: "daniel-mitchell",
    n: "Daniel Mitchell",
    role: "Supervisor",
    dept: "Front of House",
    date: "26 – 27 May 2026",
    dur: "2 days",
    impact: "Medium",
    tone: "warning",
    img: 12,
    balance: "10 days",
    submitted: "14 May 2026, 11:30 (Europe/London)",
    coverNote: "Front of House may need additional cover on Tue 26 May.",
  },
  {
    id: "priya-patel",
    n: "Priya Patel",
    role: "Head Chef",
    dept: "Kitchen",
    date: "31 May – 2 Jun 2026",
    dur: "3 days",
    impact: "High",
    tone: "danger",
    img: 47,
    balance: "8 days",
    submitted: "15 May 2026, 14:05 (Europe/London)",
    coverNote: "Kitchen is short on Sat 30 and Sun 31. Cover needed before approving.",
  },
  {
    id: "liam-oconnor",
    n: "Liam O'Connor",
    role: "Bartender",
    dept: "Bar",
    date: "25 – 31 May 2026",
    dur: "7 days",
    impact: "Medium",
    tone: "warning",
    img: 13,
    balance: "12 days",
    submitted: "16 May 2026, 08:00 (Europe/London)",
    coverNote: "Bar will need cover across the bank holiday weekend.",
  },
];

export const cal: LeaveCalEntry[] = [
  { n: "Sophie Carter", dept: "Front of House", img: 5, range: [9, 11], type: "pending" },
  { n: "Daniel Mitchell", dept: "Front of House", img: 12, range: [8, 9], type: "pending" },
  { n: "Priya Patel", dept: "Kitchen", img: 47, range: [12, 13], type: "pending" },
  { n: "Amelia Stone", dept: "Housekeeping", img: 23, range: [3, 7], type: "unavail" },
  { n: "Olivia Bennett", dept: "Front of House", img: 16, range: [10, 13], type: "annual" },
  { n: "Liam O'Connor", dept: "Bar", img: 13, range: [7, 13], type: "pending" },
];
