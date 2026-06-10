import { cn } from "@/lib/utils";
import { NOTIFICATION_TONE_CLASSES, type MockNotification } from "./notificationData";

export function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: MockNotification;
  onOpen: () => void;
  onMarkRead: () => void;
}) {
  const Icon = notification.icon;

  return (
    <article
      className={cn(
        "row relative gap-3 rounded-[10px] border p-3 transition-opacity",
        notification.read ? "opacity-70" : "opacity-100",
      )}
      style={{
        borderColor: "var(--border-faint)",
        background: notification.read ? "var(--bg-card)" : "var(--bg-raised)",
        alignItems: "flex-start",
      }}
    >
      <button
        type="button"
        aria-label={`Open notification: ${notification.title}`}
        className="absolute inset-0 cursor-pointer rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={onOpen}
      />

      <div
        className={cn(
          "bubble pointer-events-none relative h-8 w-8 shrink-0",
          NOTIFICATION_TONE_CLASSES[notification.tone],
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
        {!notification.read && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2"
            style={{
              background: "var(--teal-500)",
              borderColor: "var(--bg-overlay)",
            }}
          />
        )}
      </div>

      <div className="pointer-events-none min-w-0 grow">
        <div className="strong txt-md">{notification.title}</div>
        <div className="muted txt-sm mt-1" style={{ lineHeight: 1.45 }}>
          {notification.body}
        </div>
        <div className="row gap-2 mt-2" style={{ alignItems: "center" }}>
          <span className="link txt-sm">
            {notification.action}{" "}
            <span aria-hidden style={{ fontSize: 11 }}>
              →
            </span>
          </span>
          <span className="flex-1" />
          {!notification.read && (
            <button
              type="button"
              className="link txt-xs pointer-events-auto relative z-10"
              style={{ color: "var(--ink-400)" }}
              onClick={onMarkRead}
            >
              Mark read
            </button>
          )}
          <span className="muted txt-xs mono">{notification.time}</span>
        </div>
      </div>
    </article>
  );
}
