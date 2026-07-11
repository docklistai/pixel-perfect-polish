import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LEGAL_CONTACT_EMAIL, type LegalSection } from "../data/legalMeta";

interface LegalPageProps {
  title: string;
  /** Version tag shown as the effective date (e.g. "2026-07-10"). */
  version: string;
  intro: string;
  sections: LegalSection[];
}

/**
 * Shared shell for the public /terms and /privacy pages. Deliberately plain:
 * token-based colours, no marketing chrome, readable in both themes.
 */
export function LegalPage({ title, version, intro, sections }: LegalPageProps) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to DocklistAI
        </Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">DocklistAI</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Private beta · Effective {version}</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{intro}</p>
        </header>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-6 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground">
          <p>
            Questions or requests about this page:{" "}
            <a
              href={`mailto:${LEGAL_CONTACT_EMAIL}`}
              className="text-brand underline-offset-4 hover:underline"
            >
              {LEGAL_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-2">
            See also:{" "}
            <Link to="/terms" className="text-brand underline-offset-4 hover:underline">
              Terms of Service
            </Link>{" "}
            ·{" "}
            <Link to="/privacy" className="text-brand underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
