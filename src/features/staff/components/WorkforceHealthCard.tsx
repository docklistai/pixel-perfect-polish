import * as React from "react";
import { AlertTriangle, Clock, FileWarning, Mail, UserX } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/dl";
import type { StaffRow } from "../types";

type HealthBand = "Healthy" | "Stable" | "Needs attention" | "At risk";
type HealthTone = "success" | "info" | "warning" | "danger";

interface WorkforceIssue {
  Icon: LucideIcon;
  label: string;
}

interface WorkforceHealthResult {
  score: number;
  band: HealthBand;
  explanation: string;
  tone: HealthTone;
  issues: WorkforceIssue[];
}

// Operational score bands — labels describe admin readiness, not morale or performance.
const BANDS: Array<{ min: number; band: HealthBand; tone: HealthTone; explanation: string }> = [
  { min: 85, band: "Healthy", tone: "success", explanation: "Staff admin is in good shape." },
  { min: 70, band: "Stable", tone: "info", explanation: "A few small items to keep on top of." },
  {
    min: 50,
    band: "Needs attention",
    tone: "warning",
    explanation: "Some admin gaps need resolving this week.",
  },
  {
    min: 0,
    band: "At risk",
    tone: "danger",
    explanation: "Multiple unresolved items — action required.",
  },
];

// Demo deduction weights — deterministic frontend mock, not real analytics.
const W = {
  portalPending: 4,
  onLeave: 5,
  medAvail: 4,
  expiringCert: 4,
  missingContact: 3,
} as const;

function computeWorkforceHealth(rows: StaffRow[]): WorkforceHealthResult {
  const pendingPortal = rows.filter((r) => r.portalStatus === "Pending").length;
  const onLeave = rows.filter((r) => r.status === "On Leave").length;
  const medAvail = rows.filter((r) => r.availTone === "med").length;
  // Stubbed from known profile data not present in StaffRow (demo only).
  const expiringCerts = 2;
  const missingContact = 1;

  const issues: WorkforceIssue[] = [];
  let deduction = 0;

  if (pendingPortal > 0) {
    issues.push({ Icon: Mail, label: `${pendingPortal} portal invites not claimed` });
    deduction += pendingPortal * W.portalPending;
  }
  if (onLeave > 0) {
    issues.push({ Icon: UserX, label: `${onLeave} on leave — no cover noted` });
    deduction += onLeave * W.onLeave;
  }
  if (medAvail > 0) {
    issues.push({ Icon: Clock, label: `${medAvail} availability gap flagged` });
    deduction += medAvail * W.medAvail;
  }
  if (expiringCerts > 0) {
    issues.push({ Icon: FileWarning, label: `${expiringCerts} certifications due for renewal` });
    deduction += expiringCerts * W.expiringCert;
  }
  if (missingContact > 0) {
    issues.push({ Icon: AlertTriangle, label: `${missingContact} missing emergency contact` });
    deduction += missingContact * W.missingContact;
  }

  const score = Math.max(0, 100 - deduction);
  const config = BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
  return { score, band: config.band, tone: config.tone, explanation: config.explanation, issues };
}

const TONE_TEXT_CLS: Record<HealthTone, string> = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
};

const TONE_BADGE_CLS: Record<HealthTone, string> = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function ScoreRing({ score, tone }: { score: number; tone: HealthTone }) {
  const r = 17;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - score / 100);
  return (
    <svg
      width={44}
      height={44}
      viewBox="0 0 44 44"
      role="img"
      aria-label={`Workforce health score: ${score}%`}
      className="shrink-0"
    >
      <circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        strokeWidth={4}
        className="stroke-current text-muted-foreground opacity-20"
      />
      <circle
        cx={22}
        cy={22}
        r={r}
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 22 22)"
        className={`stroke-current ${TONE_TEXT_CLS[tone]}`}
      />
    </svg>
  );
}

export function WorkforceHealthCard({ rows }: { rows: StaffRow[] }) {
  const { score, band, tone, explanation, issues } = computeWorkforceHealth(rows);

  return (
    <Card className="rounded-2xl p-3">
      <p className="dock-section-eyebrow mb-2">Workforce health</p>

      <div className="flex items-center gap-3">
        <ScoreRing score={score} tone={tone} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold leading-none">{score}%</span>
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${TONE_BADGE_CLS[tone]}`}
            >
              {band}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{explanation}</p>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-2.5">
          <p className="text-xs font-semibold text-foreground">Why this score?</p>
          <ul className="mt-1.5 space-y-1">
            {issues.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3 w-3 shrink-0 text-warning" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
