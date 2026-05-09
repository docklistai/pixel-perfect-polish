/**
 * Local connection status chip. Reads navigator.onLine only.
 * No queueing, no real sync, no persistence.
 */
import * as React from "react";
import { SyncStatusBadge, type SyncStatus } from "@/components/dl";

function formatRelative(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  return `${Math.floor(diff / 3600)} h ago`;
}

export function ConnectionStatus({ className }: { className?: string }) {
  const [status, setStatus] = React.useState<SyncStatus>("online");
  const [checkedAt, setCheckedAt] = React.useState<Date>(() => new Date());
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      setStatus(navigator.onLine ? "online" : "offline");
    }
    const onOnline = () => {
      setStatus("online");
      setCheckedAt(new Date());
    };
    const onOffline = () => {
      setStatus("offline");
      setCheckedAt(new Date());
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Refresh the relative label periodically.
    const tick = window.setInterval(() => force(), 30_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(tick);
    };
  }, []);

  return (
    <SyncStatusBadge
      status={status}
      lastChecked={`Checked ${formatRelative(checkedAt)}`}
      className={className}
    />
  );
}
