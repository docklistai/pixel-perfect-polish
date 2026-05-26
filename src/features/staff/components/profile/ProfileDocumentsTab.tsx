import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Upload } from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import type { StaffProfile, StaffProfileDocument } from "../../types";

interface Props {
  profile: StaffProfile;
}

const STATUS_LABELS: Record<StaffProfileDocument["status"], { label: string; className: string }> =
  {
    valid: { label: "Verified", className: "bg-success-soft text-success" },
    expiring: { label: "Expiring", className: "bg-warning-soft text-warning" },
    expired: { label: "Expired", className: "bg-danger-soft text-danger" },
    missing: { label: "Missing", className: "bg-danger-soft text-danger" },
  };

function DocStat({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: "green" | "amber" | "red";
  label: string;
  value: number;
  sub: string;
}) {
  const bubble =
    tone === "green"
      ? "bg-[var(--st-green-bg)] text-[var(--st-green-ink)]"
      : tone === "amber"
        ? "bg-[var(--st-amber-bg)] text-[var(--st-amber-ink)]"
        : "bg-[var(--st-red-bg)] text-[var(--st-red-ink)]";

  return (
    <ProfileCard title={label} className="p-4">
      <div className="flex items-start gap-3">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${bubble}`}>
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

function DocumentTile({ doc }: { doc: StaffProfileDocument }) {
  const status = STATUS_LABELS[doc.status];
  const bubble =
    doc.status === "valid"
      ? "bg-success-soft text-success"
      : doc.status === "expiring"
        ? "bg-warning-soft text-warning"
        : "bg-danger-soft text-danger";

  return (
    <button
      type="button"
      className="flex items-start gap-3 rounded-2xl border border-border/40 bg-card p-4 text-left transition-colors hover:bg-muted/40"
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bubble}`}>
        <Upload className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{doc.name}</div>
        <div className="text-xs text-muted-foreground">{doc.type}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{doc.expiry ?? "No expiry"}</span>
        </div>
      </div>
      <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}

export function ProfileDocumentsTab({ profile }: Props) {
  const counts = {
    verified: profile.documents.filter((doc) => doc.status === "valid").length,
    expiring: profile.documents.filter((doc) => doc.status === "expiring").length,
    missing: profile.documents.filter((doc) => doc.status === "missing").length,
  };
  const summary = profile.documentsSummary;
  const attention = summary.expiringSoon + summary.missing;

  return (
    <div className="space-y-4">
      <ProfileCard
        title="Document readiness"
        className="p-0 overflow-hidden"
        action={
          <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
            {attention} attention items
          </span>
        }
      >
        <div className="border-b border-[var(--st-amber-line)] bg-[var(--st-amber-bg)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--st-amber-bg)] text-[var(--st-amber-ink)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--st-amber-ink)]">
                Manager summary
              </div>
              <p className="mt-1 text-sm leading-6 text-foreground text-pretty">
                {summary.total} documents on file. {summary.expiringSoon} are nearing expiry and{" "}
                {summary.missing} still need attention before the next publish.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 p-5">
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              On file
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">{summary.total}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Expiring soon
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">{summary.expiringSoon}</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Missing
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">{summary.missing}</div>
          </div>
        </div>
      </ProfileCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DocStat
          icon={CheckCircle2}
          tone="green"
          label="Verified"
          value={counts.verified}
          sub="On file and in date"
        />
        <DocStat
          icon={AlertTriangle}
          tone="amber"
          label="Expiring soon"
          value={counts.expiring}
          sub="Within 90 days"
        />
        <DocStat
          icon={AlertTriangle}
          tone="red"
          label="Missing"
          value={counts.missing}
          sub="Action required"
        />
      </div>

      <ProfileCard
        title="Documents"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-[var(--bg-raised)] px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Filter
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Upload className="h-3 w-3" aria-hidden />
              Upload
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {profile.documents.map((doc) => (
            <DocumentTile key={doc.name} doc={doc} />
          ))}
        </div>
      </ProfileCard>
    </div>
  );
}
