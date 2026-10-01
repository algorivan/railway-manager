import { z } from 'zod';
export declare const StationFacilitiesSchema: z.ZodObject<{
    hasCargoTerminal: z.ZodBoolean;
    hasDepotConnection: z.ZodBoolean;
    hasExecutiveLounge: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    hasCargoTerminal: boolean;
    hasDepotConnection: boolean;
    hasExecutiveLounge: boolean;
}, {
    hasCargoTerminal: boolean;
    hasDepotConnection: boolean;
    hasExecutiveLounge: boolean;
}>;
export type StationFacilities = z.infer<typeof StationFacilitiesSchema>;
//# sourceMappingURL=facilities.schema.d.ts.map