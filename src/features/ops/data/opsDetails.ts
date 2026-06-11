import type { OpsEntryDetails } from "../types";

const OPS_DETAILS: Record<string, OpsEntryDetails> = {
  "Daily briefing completed": {
    description:
      "Front of House daily briefing covered allergens, VIPs, daily specials and uniform spot-check.",
    location: "FOH back-of-house",
    notes: "All 12 FOH staff attended. Sophie ran the briefing — minutes attached.",
    followups: [
      { title: "Print updated allergen sheet for kitchen pass", done: true },
      { title: "Confirm VIP table 14 with sommelier", done: true },
    ],
  },
  "Incident report – Guest slip in lobby": {
    description:
      "Guest slipped near the entrance — wet floor sign was missing after cleaning. Guest declined first aid but agreed to a follow-up call.",
    location: "Main lobby, near reception",
    severity: "High",
    notes:
      "Floor was buffed at 09:00. Wet floor sign was misplaced during the change-over from night porter to FOH.",
    followups: [
      { title: "Call guest before 18:00 (Sophie)", done: false },
      { title: "Check insurance reference — claim number", done: false },
      { title: "Brief night porter at handover", done: true },
    ],
  },
  "Maintenance – Leaking tap": {
    description:
      "Slow drip from the basin tap in room 205. Reported by housekeeping during AM service.",
    location: "Room 205",
    severity: "Medium",
    notes: "Towel placed temporarily. Plumber scheduled for Thursday morning.",
    followups: [
      { title: "Confirm plumber arrival window", done: true },
      { title: "Move guest if not fixed by Thursday 14:00", done: false },
    ],
  },
};

const normalizeTitle = (title: string) => title.replace(/[–—-]/g, "-").replace(/\s+/g, " ").trim();

/** Detail body for an ops entry; falls back to a generic record. */
export function resolveOpsDetails(title: string, fallbackLocation: string): OpsEntryDetails {
  const normalized = normalizeTitle(title);
  const key = Object.keys(OPS_DETAILS).find((k) => normalizeTitle(k) === normalized);
  if (key) return OPS_DETAILS[key];
  return {
    description:
      "Standard log entry. Includes audience, severity, and follow-up tasks where relevant.",
    location: fallbackLocation,
    followups: [],
  };
}
