import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { liveWeekLabel } from "../lib/liveRotaDates";
import { findRecentPatternWeek, NO_RECENT_PATTERN_REASON } from "./buildWeekDemandResolution";

/**
 * Which demand sources this week could actually be built from.
 *
 * Read-only, and deliberately asked BEFORE a proposal is requested. Previously a
 * manager picked "last week's pattern", pressed Build, waited, and only then read
 * that there was nothing to build from — a refusal arriving after the work looks
 * like a failure rather than a fact about their rota.
 *
 * It answers only the question the source step cannot answer for itself. Template
 * availability is already known on the client from the templates query, and the
 * current week's own counts are already on screen, so neither is duplicated here.
 */

const inputSchema = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
});

export type PreviousPatternAvailability =
  | {
      available: true;
      /** The week the pattern would come from — not necessarily the previous one. */
      weekStart: string;
      weekLabel: string;
      weeksBack: number;
      shiftCount: number;
    }
  | { available: false; reason: string };

export type BuildWeekSourcesResult =
  | { ok: true; previousPattern: PreviousPatternAvailability }
  | { ok: false; message: string };

export const buildWeekSourcesFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<BuildWeekSourcesResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { getLiveContext } = await import("./rotaLiveMutationContext");
    const supabase = getSupabaseServerClient();

    // No week is created here: asking what could be built must never write.
    const context = await getLiveContext(
      { weekOffset: data.weekOffset, ...(data.locationId ? { locationId: data.locationId } : {}) },
      { createWeek: false },
    );

    const patternWeek = await findRecentPatternWeek({
      supabase,
      workspaceId: context.workspaceId,
      locationId: context.location.id,
      weekStart: context.weekStart,
    });

    return {
      ok: true,
      previousPattern: patternWeek
        ? {
            available: true,
            weekStart: patternWeek.weekStart,
            weekLabel: liveWeekLabel(patternWeek.weekStart),
            weeksBack: patternWeek.weeksBack,
            shiftCount: patternWeek.shiftCount,
          }
        : { available: false, reason: NO_RECENT_PATTERN_REASON },
    };
  });
