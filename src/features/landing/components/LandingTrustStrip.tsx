import {
  CheckCircle2,
  Eye,
  Lock,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";

const items = [
  { Icon: CheckCircle2, label: "Manager confirms before publishing" },
  { Icon: Lock, label: "Draft changes stay manager-only" },
  { Icon: Eye, label: "Staff see the published rota" },
  { Icon: Sparkles, label: "AI suggests, manager decides" },
  { Icon: ReceiptText, label: "Approved hours export, not payroll" },
  { Icon: Wallet, label: "Workspace pricing, no per-seat anxiety" },
] as const;

export function LandingTrustStrip() {
  return (
    <section className="border-b border-[#0c1412]/10 bg-[var(--landing-paper)] text-[var(--landing-ink)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => (
          <div
            key={it.label}
            className={`flex items-center gap-3 px-6 py-5 text-[13.5px] leading-snug text-[#3f4744] sm:px-7 ${
              i % 3 !== 2 ? "lg:border-r" : ""
            } ${i % 2 !== 1 ? "sm:border-r lg:border-r-0" : ""} ${
              i < items.length - (items.length % 3 || 3) ? "" : ""
            } border-[#0c1412]/8 ${i >= 3 ? "border-t" : ""} ${
              i >= 2 ? "sm:border-t-0" : ""
            } ${i % 2 === 1 ? "sm:border-t" : ""} ${
              i >= 3 ? "lg:border-t" : "lg:border-t-0"
            } ${i < 3 ? "lg:border-t-0" : ""}`}
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--landing-teal)]/12 text-[var(--landing-teal-deep)]">
              <it.Icon className="size-3.5" aria-hidden="true" strokeWidth={2} />
            </span>
            <span>{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
