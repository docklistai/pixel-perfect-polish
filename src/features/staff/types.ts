export interface StaffRow {
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
}
