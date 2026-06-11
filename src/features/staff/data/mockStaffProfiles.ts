import type { StaffProfile } from "../types";
import { liamOconnor, oliviaBennett } from "./profiles/bar-coffee";
import { danielMitchell, jamesWalker } from "./profiles/foh";
import { ameliaStone, noahEvans } from "./profiles/housekeeping-porter";
import { priyaPatel } from "./profiles/kitchen";
import { sophieCarter } from "./profiles/sophieCarter";

export const mockStaffProfiles: Record<string, StaffProfile> = {
  "sophie-carter": sophieCarter,
  "daniel-mitchell": danielMitchell,
  "priya-patel": priyaPatel,
  "liam-oconnor": liamOconnor,
  "olivia-bennett": oliviaBennett,
  "james-walker": jamesWalker,
  "amelia-stone": ameliaStone,
  "noah-evans": noahEvans,
};
