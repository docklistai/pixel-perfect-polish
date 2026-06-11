import * as React from "react";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { ProfileCard } from "./ProfileCard";

export function ProfileScheduleSidebar() {
  return (
    <div className="space-y-4 min-w-0">
      <ProfileCard
        title="Availability preview"
        action={
          <button
            type="button"
            onClick={() =>
              toast.info("Availability", {
                description: "Availability editing arrives with the staff app rollout.",
              })
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60"
            aria-label="Edit availability"
          >
            <Calendar className="h-3.5 w-3.5" aria-hidden />
          </button>
        }
      >
        <div className="space-y-0">
          {[
            ["Mon", "08:00 – 22:00", "green"],
            ["Tue", "08:00 – 18:00", "green"],
            ["Wed", "Any", "green"],
            ["Thu", "14:00 – 23:00", "green"],
            ["Fri", "Any", "green"],
            ["Sat", "Not available", "red"],
            ["Sun", "After 14:00", "amber"],
          ].map(([day, availability, tone]) => (
            <div
              key={day}
              className="flex items-center border-b border-border/40 py-2.5 last:border-0"
            >
              <span className="w-10 font-semibold text-foreground">{day}</span>
              <span
                className={`text-sm ${
                  tone === "red"
                    ? "text-danger"
                    : tone === "amber"
                      ? "text-warning"
                      : "text-success"
                }`}
              >
                {availability}
              </span>
              <div className="flex-1" />
              {tone === "red" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-danger" aria-hidden />
              ) : tone === "amber" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
              ) : (
                <Clock className="h-3.5 w-3.5 text-success" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard title="Rota context">
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <Clock className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold">Rota published</div>
              <div className="text-xs text-muted-foreground">
                The full 8–14 Jun rota is published and live.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-warning-soft p-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-warning text-white">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold">Next week needs review</div>
              <div className="text-xs text-muted-foreground">
                Daniel has overlapping draft shifts on Fri 19 Jun.
              </div>
            </div>
          </div>
        </div>
      </ProfileCard>
    </div>
  );
}
