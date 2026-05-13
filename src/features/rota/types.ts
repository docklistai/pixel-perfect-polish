export type Shift = {
  time: string;
  role: string;
  tone: string;
  flag?: "conflict" | "open" | "off";
};

export type ShiftDetail = Shift & { staff: string; day: string };

export type StaffMember = {
  name: string;
  role: string;
  hrs: string;
  img: number;
  tone: string;
  shifts: Shift[];
};

export const off: Shift = { time: "—", role: "Day off", tone: "off", flag: "off" };
