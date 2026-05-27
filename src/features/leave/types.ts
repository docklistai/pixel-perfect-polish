export interface LeaveRequest {
  id: string;
  n: string;
  role: string;
  dept: string;
  date: string;
  days: number;
  type: string;
  impact: "Low" | "Medium" | "High";
  tone: "success" | "warning" | "danger";
  state: "pending" | "approved" | "declined";
  notice: number;
  reason: string;
  img: number;
  balance: string;
  submitted: string;
  coverNote: string;
}

export interface LeaveCalEntry {
  n: string;
  dept: string;
  img: number;
  range: [number, number];
  type: "annual" | "pending" | "unavail";
}
