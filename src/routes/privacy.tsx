import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/features/legal/components/LegalPage";
import { LEGAL_VERSIONS } from "@/features/legal/data/legalMeta";
import { privacySections } from "@/features/legal/data/privacySections";

// Public page — intentionally unguarded so signup consent can link to it.
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Docklist" },
      {
        name: "description",
        content:
          "How DocklistAI stores and uses workspace and account data during the private beta.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      version={LEGAL_VERSIONS.privacy}
      intro="This page explains, in plain language, what information DocklistAI stores when you use the private beta, where it lives, and how to ask us about it."
      sections={privacySections}
    />
  );
}
