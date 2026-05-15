import type { StaffProfile } from "../types";
import { sophieCarter } from "./profiles/sophieCarter";
import { danielMitchell, jamesWalker, isabellaMartin } from "./profiles/foh";
import { priyaPatel, noahWilliams } from "./profiles/kitchen";
import { liamOconnor, oliviaBennett } from "./profiles/bar-coffee";
import { ameliaStone, noahEvans } from "./profiles/housekeeping-porter";

export const mockStaffProfiles: Record<string, StaffProfile> = {
  "sophie-carter": sophieCarter,
  "daniel-mitchell": danielMitchell,
  "priya-patel": priyaPatel,
  "liam-oconnor": liamOconnor,
  "olivia-bennett": oliviaBennett,
  "james-walker": jamesWalker,
  "amelia-stone": ameliaStone,
  "noah-evans": noahEvans,
  "noah-williams": noahWilliams,
  "isabella-martin": isabellaMartin,
};
