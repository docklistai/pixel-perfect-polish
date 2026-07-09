/**
 * Maps a leave request's type (enum like "annual_leave" or a display label like
 * "Annual leave") to a short badge the rota grid can show in a person's cell, so
 * a manager sees *which* kind of absence — holiday, sick, unpaid — while building
 * the rota, without cross-referencing the Leave page. Reads existing leave data;
 * it never creates leave.
 */
export function shortLeaveLabel(type: string): string {
  const value = type.toLowerCase();
  if (value.includes("annual") || value.includes("holiday") || value.includes("vacation")) {
    return "Holiday";
  }
  if (value.includes("sick")) return "Sick";
  if (value.includes("unpaid")) return "Unpaid";
  if (value.includes("personal") || value.includes("compassionate")) return "Personal";
  if (value.includes("parental") || value.includes("maternity") || value.includes("paternity")) {
    return "Parental";
  }
  return "Leave";
}
