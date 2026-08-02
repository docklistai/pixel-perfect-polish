import type { Tone } from "@/components/dl";

/**
 * Badge tones for the live staff profile header.
 *
 * Extracted from LiveStaffProfile so that file stays inside its component
 * line budget. Note that StaffProfileHeader and ProfileOverviewRail still carry
 * their own near-identical copies — consolidating those is a separate change and
 * was deliberately left alone here.
 */
export function statusTone(status: string): Tone {
  if (status === "Active") return "success";
  if (status === "On Leave") return "purple";
  if (status === "Probation") return "info";
  return "muted";
}

export function portalTone(status: string | undefined): Tone {
  if (status === "Claimed") return "success";
  if (status === "Pending") return "warning";
  return "muted";
}
