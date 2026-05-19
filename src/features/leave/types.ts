export interface LeaveRequest {
  id: string;
  n: string;
  role: string;
  dept: string;
  date: string;
  dur: string;
  impact: "Low" | "Medium" | "High";
  tone: "success" | "warning" | "danger";
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
