export interface TimesheetRow {
  id: string;
  n: string;
  role: string;
  img: number;
  sched: string;
  in: string;
  inN: string;
  inTone?: "warning" | "danger";
  out: string;
  outN: string;
  outTone?: "warning" | "danger";
  brk: string;
  paid: string;
  exc: string;
  excTone?: "danger";
  st: string;
  stTone: "success" | "warning" | "muted" | "danger";
}

export interface MissedClockIn {
  id: string;
  n: string;
  t: string;
  img: number;
}

export interface TimeQuery {
  id: string;
  n: string;
  t: string;
  st: string;
  stTone: "danger" | "info";
  img: number;
}
