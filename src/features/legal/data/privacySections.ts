import type { LegalSection } from "./legalMeta";

/**
 * Plain-language beta privacy policy. Every statement here must stay
 * supported by the actual implementation — no certifications, subprocessor
 * lists, retention schedules, or guarantees the product does not deliver.
 */
export const privacySections: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      "DocklistAI is a scheduling workspace for hospitality teams: rotas, light workforce admin, and manager-led planning support. The product is currently in private beta and access is arranged directly with our team.",
    ],
  },
  {
    heading: "Information we store",
    body: ["We store the information needed to run your workspace, and nothing beyond it:"],
    bullets: [
      "Account details — your email address, display name, and sign-in credentials (credentials are managed by our authentication provider, Supabase; we never see your password).",
      "Workspace data entered by managers — staff names, roles, departments, contact details managers choose to add, contracted hours, pay-rate settings, rotas and shifts, time entries, and leave records.",
      "Staff portal access records — which access codes were issued and claimed, used to secure staff sign-in.",
      "Workspace settings — opening days and hours, labour budgets, and similar operational preferences.",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "We use a session cookie to keep you signed in, a cookie that remembers which workspace you are working in, local storage for the light/dark theme preference, and session storage for a small number of temporary interface states. The app contains no advertising trackers and no third-party analytics scripts.",
    ],
  },
  {
    heading: "Where your data is processed",
    body: [
      "Your data is stored in a managed PostgreSQL database hosted by Supabase (London / West Europe region) and the application is served through Cloudflare. Both providers process data on our behalf to run the service.",
    ],
  },
  {
    heading: "What staff can see",
    body: [
      "Staff portal accounts see published rota snapshots (including colleagues' names, roles, and shift times on the published rota — the digital equivalent of the rota on the wall), their own time entries, their own leave requests, and their own availability records. Staff never see manager drafts, manager notes, pay rates or pay settings, or other staff members' private details.",
    ],
  },
  {
    heading: "Emails we send",
    body: [
      "We send transactional emails only — account confirmation and password-reset messages. We do not send marketing email.",
    ],
  },
  {
    heading: "Access, correction, and deletion",
    body: [
      "During the private beta there is no self-serve full-workspace export or deletion tool. To access, correct, export, or delete personal data, contact us. We verify the requester's identity and authority, handle the request manually, and confirm the outcome, subject to any records we must retain by law. Depending on where you live, you may have statutory rights over your personal data; contact us to exercise them and we will respond.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We will update this page as the product evolves and flag material changes inside the product. This is a plain-language beta policy and will be reviewed and expanded before general availability.",
    ],
  },
];
