export function formatPortalElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(ms) ? ms / 1000 : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
