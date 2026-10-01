import { z } from 'zod';

export const StationFacilitiesSchema = z.object({
  hasCargoTerminal: z.boolean(),
  hasDepotConnection: z.boolean(),
  hasExecutiveLounge: z.boolean(),
});

export type StationFacilities = z.infer<typeof StationFacilitiesSchema>;
