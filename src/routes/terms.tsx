import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/features/legal/components/LegalPage";
import { LEGAL_VERSIONS } from "@/features/legal/data/legalMeta";
import { termsSections } from "@/features/legal/data/termsSections";

// Public page — intentionally unguarded so signup consent can link to it.
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Docklist" },
      {
        name: "description",
        content: "The plain-language terms for using the DocklistAI private beta.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      version={LEGAL_VERSIONS.terms}
      intro="These are the plain-language terms for using DocklistAI during the private beta. Managers and owners accept them when creating an account. Staff portal access is arranged by a workspace's managers — staff are not currently asked to accept these terms themselves."
      sections={termsSections}
    />
  );
}
