import type { LegalSection } from "./legalMeta";

/**
 * Plain-language beta terms. Statements must stay supported by the actual
 * product — no invented guarantees, SLAs, or jurisdiction clauses (governing
 * law is an owner/legal decision; see docs/legal/README.md).
 */
export const termsSections: LegalSection[] = [
  {
    heading: "The service",
    body: [
      "DocklistAI is a scheduling workspace for hospitality teams: rota planning and publishing, light workforce admin (staff records, time entries, leave), and manager-led planning support. The service is in private beta — access is invite-only and features may change, be added, or be removed while we build.",
    ],
  },
  {
    heading: "Accounts and access codes",
    body: [
      "Manager accounts sign in with an email and password; keep those credentials private. Staff access the portal with a workspace code plus a personal access code issued by their manager. Access codes are personal — do not share them, and managers should only distribute codes over channels they trust. Tell us promptly if you believe an account or code has been compromised.",
    ],
  },
  {
    heading: "Your workspace data",
    body: [
      "The data entered into a workspace — staff details, rotas, time entries, leave records — belongs to the business that owns that workspace. We process it only to provide the service. Payroll-ready exports let you take approved-hours data out of the product; we do not operate payroll or billing on your behalf.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Use the service only for managing your own business's scheduling and team records, and only with data you are entitled to hold. Do not attempt to access other workspaces, bypass access controls, probe the service for weaknesses, or use it for anything unlawful.",
    ],
  },
  {
    heading: "Beta status and availability",
    body: [
      "The service is provided as-is during the private beta. We work to keep it reliable, but we make no availability, uptime, or fitness guarantees while in beta. The approved-hours export covers reviewed timesheet records; contact us if you need a broader workspace export during the beta.",
    ],
  },
  {
    heading: "Ending the beta relationship",
    body: [
      "You can stop using the service at any time. Contact us to request suspension, export, correction, or deletion. During the beta we verify the requester's authority, handle the request manually, and confirm the outcome, subject to any records we must retain by law. We may suspend access that breaks these terms or puts other workspaces' data at risk.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We will update this page as the product evolves and flag material changes inside the product. These are plain-language beta terms and will be reviewed and expanded before general availability.",
    ],
  },
];
