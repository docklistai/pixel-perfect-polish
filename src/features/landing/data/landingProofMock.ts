export const proofDays = [
  { label: "Mon", date: "May 19" },
  { label: "Tue", date: "May 20" },
  { label: "Wed", date: "May 21" },
  { label: "Thu", date: "May 22" },
  { label: "Fri", date: "May 23" },
  { label: "Sat", date: "May 24" },
  { label: "Sun", date: "May 25" },
] as const;

export type ProofShiftTone = "am" | "pm" | "dbl" | "off" | "open" | "clash" | "leave";

export interface ProofShift {
  tone: ProofShiftTone;
  time?: string;
  label?: string;
  sub?: string;
}

export interface ProofTeamRow {
  initials: string;
  name: string;
  role: string;
  shifts: ProofShift[];
}

export const proofRows: ProofTeamRow[] = [
  {
    initials: "AO",
    name: "Aoife M.",
    role: "FOH Lead",
    shifts: [
      { tone: "am", time: "09 - 17", sub: "Floor · A" },
      { tone: "am", time: "09 - 17", sub: "Floor · A" },
      { tone: "off", label: "Off" },
      { tone: "pm", time: "16 - 24", sub: "Service · A" },
      { tone: "pm", time: "16 - 24", sub: "Service · A" },
      { tone: "dbl", time: "11 - 23", sub: "Double · A" },
      { tone: "off", label: "Off" },
    ],
  },
  {
    initials: "JR",
    name: "Jamie R.",
    role: "Bar",
    shifts: [
      { tone: "off", label: "Off" },
      { tone: "pm", time: "17 - 01", sub: "Bar · 2" },
      { tone: "pm", time: "17 - 01", sub: "Bar · 2" },
      { tone: "pm", time: "17 - 01", sub: "Bar · 2" },
      { tone: "clash", time: "17 - 01", sub: "Clash · leave" },
      { tone: "pm", time: "17 - 01", sub: "Bar · 2" },
      { tone: "off", label: "Off" },
    ],
  },
  {
    initials: "PS",
    name: "Priya S.",
    role: "Sous Chef",
    shifts: [
      { tone: "am", time: "10 - 18", sub: "Kitchen" },
      { tone: "am", time: "10 - 18", sub: "Kitchen" },
      { tone: "am", time: "10 - 18", sub: "Kitchen" },
      { tone: "off", label: "Off" },
      { tone: "dbl", time: "10 - 22", sub: "Double" },
      { tone: "dbl", time: "10 - 22", sub: "Double" },
      { tone: "am", time: "10 - 18", sub: "Kitchen" },
    ],
  },
  {
    initials: "MK",
    name: "Marcus K.",
    role: "CDP",
    shifts: [
      { tone: "leave", label: "Annual leave" },
      { tone: "leave", label: "Annual leave" },
      { tone: "leave", label: "Annual leave" },
      { tone: "leave", label: "Annual leave" },
      { tone: "leave", label: "Annual leave" },
      { tone: "pm", time: "15 - 23", sub: "Kitchen" },
      { tone: "pm", time: "15 - 23", sub: "Kitchen" },
    ],
  },
  {
    initials: "EV",
    name: "Elena V.",
    role: "Server",
    shifts: [
      { tone: "am", time: "12 - 17", sub: "Lunch" },
      { tone: "off", label: "Off" },
      { tone: "open", time: "- OPEN -", sub: "5h · Lunch" },
      { tone: "am", time: "12 - 17", sub: "Lunch" },
      { tone: "pm", time: "17 - 23", sub: "Service" },
      { tone: "pm", time: "17 - 23", sub: "Service" },
      { tone: "open", time: "- OPEN -", sub: "6h · Service" },
    ],
  },
  {
    initials: "TH",
    name: "Theo H.",
    role: "Floor",
    shifts: [
      { tone: "pm", time: "17 - 23", sub: "Service · B" },
      { tone: "pm", time: "17 - 23", sub: "Service · B" },
      { tone: "pm", time: "17 - 23", sub: "Service · B" },
      { tone: "off", label: "Off" },
      { tone: "dbl", time: "11 - 23", sub: "Double · B" },
      { tone: "dbl", time: "11 - 23", sub: "Double · B" },
      { tone: "pm", time: "17 - 23", sub: "Service · B" },
    ],
  },
];

export const proofStats = [
  { label: "Coverage", value: "94", unit: "%", tone: "ok", delta: "Up 6% vs. last week" },
  { label: "Open shifts", value: "2", unit: "", tone: "warn", delta: "Lunch · Wed, Sun" },
  { label: "Clashes", value: "1", unit: "", tone: "warn", delta: "Resolve before publish" },
  {
    label: "Hours · target",
    value: "312",
    unit: "/ 320",
    tone: "ok",
    delta: "Within contracted range",
  },
] as const;

export const proofLegend = [
  { label: "Day shift", tone: "am" },
  { label: "Evening", tone: "pm" },
  { label: "Double", tone: "dbl" },
  { label: "Open", tone: "open" },
  { label: "Clash", tone: "clash" },
  { label: "Leave", tone: "leave" },
] as const;
