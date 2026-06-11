/** Demo options for the ops log-entry and handover modals — prototype parity. */

export const logEntryTypes = [
  "Incident",
  "Maintenance",
  "Shift briefing",
  "Handover note",
  "General note",
];

export const logEntrySeverities = ["Low", "Medium", "High", "Critical"];

export const logEntryLocations = [
  "Riverside Restaurant",
  "Bar",
  "Lobby",
  "Room (specify)…",
  "Kitchen",
];

export const logEntryStaff = [
  "Alex Thompson (you)",
  "Sophie Carter",
  "Daniel Mitchell",
  "Priya Patel",
  "Liam O'Connor",
  "Olivia Bennett",
  "Ava Thompson",
  "James Lewis",
];

export const handoverRecipients = [
  { name: "Olivia Bennett", role: "Duty manager", current: true },
  { name: "Daniel Mitchell", role: "Sous chef", current: false },
  { name: "Alex Thompson", role: "GM", current: false },
];

export const handoverAiDraft = `Heading into evening service. Three open items to keep an eye on:

• Lobby slip incident at 09:20 — guest declined first aid, follow-up call due before 18:00 (Sophie).
• Room 205 leaking tap — temporary towel in place, plumber confirmed Thursday morning.
• VIP wedding reception 18:30 — 120 covers. FOH all-hands at 17:30.

Coverage is solid. Liam called in covering closing — please thank him at end of service.`;
