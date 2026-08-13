export function formatMinutes(minutes: number): string {
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours.toLocaleString("en-GB")}h`;
  return `${hours.toLocaleString("en-GB", { maximumFractionDigits: 1 })}h`;
}
