import { z } from 'zod';
export const CatchmentProfileSchema = z
    .object({
    baseDailyDemand: z.number().int().nonnegative('Base daily demand must be a non-negative integer'),
    commuterShare: z.number().min(0.0).max(1.0),
    businessShare: z.number().min(0.0).max(1.0),
    touristShare: z.number().min(0.0).max(1.0),
})
    .refine((profile) => Math.abs(profile.commuterShare + profile.businessShare + profile.touristShare - 1.0) < 0.001, { message: 'Sum of commuterShare, businessShare, and touristShare must equal 1.0' });
//# sourceMappingURL=catchment.schema.js.map