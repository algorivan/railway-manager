import { z } from 'zod';
export declare const CatchmentProfileSchema: z.ZodEffects<z.ZodObject<{
    baseDailyDemand: z.ZodNumber;
    commuterShare: z.ZodNumber;
    businessShare: z.ZodNumber;
    touristShare: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    baseDailyDemand: number;
    commuterShare: number;
    businessShare: number;
    touristShare: number;
}, {
    baseDailyDemand: number;
    commuterShare: number;
    businessShare: number;
    touristShare: number;
}>, {
    baseDailyDemand: number;
    commuterShare: number;
    businessShare: number;
    touristShare: number;
}, {
    baseDailyDemand: number;
    commuterShare: number;
    businessShare: number;
    touristShare: number;
}>;
export type CatchmentProfile = z.infer<typeof CatchmentProfileSchema>;
//# sourceMappingURL=catchment.schema.d.ts.map