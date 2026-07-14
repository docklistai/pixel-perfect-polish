import { mockProfile } from "../data/mockPortalData";
import { usePortalProfile } from "./usePortalProfile";

/**
 * The signed-in staff member's venue timezone: primary location first, then
 * the workspace timezone (both resolved server-side in the
 * `staff_portal_profile` view). Every portal date/time render derives from
 * this one authority — never a hardcoded zone.
 */
export function usePortalTimezone(): string | null {
  const profile = usePortalProfile();
  if (!profile.enabled) return mockProfile.timezone;
  return profile.data?.timezone ?? null;
}
