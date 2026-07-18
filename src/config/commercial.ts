export const SUPPORT_EMAIL = "docklistai@gmail.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const BETA_ACCESS_MAILTO = `${SUPPORT_MAILTO}?subject=${encodeURIComponent(
  "DocklistAI private beta access",
)}`;

export const BILLING_ACTIVE = false;

export const COMMERCIAL_PLANS = {
  starter: { name: "Starter", monthlyPrice: "£0", staffLimit: "Up to 5 staff" },
  core: { name: "Core", monthlyPrice: "£39", staffLimit: "Up to 25 staff" },
  pro: { name: "Pro", monthlyPrice: "£79", staffLimit: "Up to 50 staff" },
} as const;
