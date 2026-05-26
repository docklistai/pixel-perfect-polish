import * as React from "react";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile } from "../../types";

interface Props {
  profile: StaffProfile;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  valid: { label: "Verified", cls: "bg-success-soft text-success" },
  expiring: { label: "Expiring", cls: "bg-warning-soft text-warning" },
  expired: { label: "Expired", cls: "bg-danger-soft text-danger" },
  missing: { label: "Missing", cls: "bg-danger-soft text-danger" },
};

function DocStat({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  color: "green" | "amber" | "red";
  label: string;
  value: number;
  sub: string;
}) {
  const tone =
    color === "green"
      ? "var(--st-green-ink)"
      : color === "amber"
        ? "var(--st-amber-ink)"
        : "var(--st-red-ink)";
  const bg =
    color === "green"
      ? "var(--st-green-bg)"
      : color === "amber"
        ? "var(--st-amber-bg)"
        : "var(--st-red-bg)";

  return (
    <ProfileCard title={label} className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-8 items-center justify-center rounded-full"
          style={{ background: bg, color: tone }}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
    </ProfileCard>
  );
}

export function ProfileDocumentsTab({ profile }: Props) {
  const counts = {
    verified: profile.documents.filter((doc) => doc.status === "valid").length,
    expiring: profile.documents.filter((doc) => doc.status === "expiring").length,
    missing: profile.documents.filter((doc) => doc.status === "missing").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DocStat
          icon={CheckCircle2}
          color="green"
          label="Verified"
          value={counts.verified}
          sub="On file and in date"
        />
        <DocStat
          icon={AlertTriangle}
          color="amber"
          label="Expiring soon"
          value={counts.expiring}
          sub="Within 90 days"
        />
        <DocStat
          icon={AlertTriangle}
          color="red"
          label="Missing"
          value={counts.missing}
          sub="Action required"
        />
      </div>

      <ProfileCard
        title="Documents"
        action={
          <button
            type="button"
            onClick={() => undefined}
            className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Upload className="h-3 w-3" aria-hidden />
            Upload
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {profile.documents.map((doc) => {
            const status = STATUS_LABELS[doc.status] ?? STATUS_LABELS.valid;
            return (
              <button
                key={doc.name}
                type="button"
                onClick={() => undefined}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    doc.status === "valid"
                      ? "bg-success-soft text-success"
                      : doc.status === "expiring"
                        ? "bg-warning-soft text-warning"
                        : "bg-danger-soft text-danger"
                  }`}
                >
                  <Upload className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{doc.name}</div>
                  <div className="text-xs text-muted-foreground">{doc.type}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {doc.expiry ?? "No expiry"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ProfileCard>
    </div>
  );
}
